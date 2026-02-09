"use server";

import { auth } from "@/lib/supabase/server";
import {
  getLeagueById,
  getLeagueMembers,
  getLeagueSettings,
  getLeagueMatchups,
  getMemberRosterWithAdp,
  updateMatchupScores,
  updateLeagueWeekAndPhase,
  updateLeaguePhase,
  getMockPlayerStats,
  getAllRosteredPlayerIds,
  createMockPlayerStatsBatch,
  mockStatsExistForWeek,
} from "@/lib/db/queries";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { generateSlotConfig } from "@/lib/roster-config";
import { calculateTeamScore } from "@/lib/scoring-utils";
import { setAllBotLineupsAction, fillAllBotRostersAction } from "./bot";

// Position-based score ranges for mock stats
const SCORE_RANGES: Record<string, { min: number; max: number }> = {
  QB: { min: 10, max: 30 },
  RB: { min: 5, max: 25 },
  WR: { min: 5, max: 25 },
  TE: { min: 3, max: 15 },
  K: { min: 5, max: 15 },
  DEF: { min: 0, max: 20 },
};

function generateRandomScore(position: string): number {
  const range = SCORE_RANGES[position] || { min: 0, max: 10 };
  const score = range.min + Math.random() * (range.max - range.min);
  return Math.round(score * 10) / 10;
}

async function generateMockStatsForWeek(leagueId: string, week: number) {
  // Get all rostered player IDs
  const rosteredPlayerIds = await getAllRosteredPlayerIds(leagueId);
  if (rosteredPlayerIds.length === 0) return;

  // Get player details for position info
  const playerDetails = await db
    .select({
      id: players.id,
      position: players.position,
      team: players.team,
    })
    .from(players)
    .where(inArray(players.id, rosteredPlayerIds));

  // Generate random teams on bye for this week (2-3 teams)
  const allTeams = Array.from(new Set(playerDetails.map((p) => p.team).filter(Boolean)));
  const numByeTeams = 2 + Math.floor(Math.random() * 2);
  const shuffledTeams = allTeams.sort(() => Math.random() - 0.5);
  const byeTeams = new Set(shuffledTeams.slice(0, numByeTeams));

  // Generate stats for each rostered player
  const statsToCreate = playerDetails.map((player) => {
    const isOnBye = player.team ? byeTeams.has(player.team) : false;
    const isInjured = !isOnBye && Math.random() < 0.05;
    const points = isOnBye || isInjured ? 0 : generateRandomScore(player.position);

    return {
      leagueId,
      playerId: player.id,
      week,
      points,
      isOnBye,
      isInjured,
    };
  });

  await createMockPlayerStatsBatch(statsToCreate);
}

function calculateMockTeamScore(
  roster: { playerId: string; slot: string }[],
  starterSlots: string[],
  mockStats: Map<string, number>
): number {
  const starterSlotSet = new Set(starterSlots);
  let total = 0;

  for (const player of roster) {
    if (starterSlotSet.has(player.slot)) {
      total += mockStats.get(player.playerId) ?? 0;
    }
  }

  return Math.round(total * 10) / 10;
}

export async function startWeekAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const league = await getLeagueById(leagueId);
    if (!league) return { error: "League not found" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };
    if (!currentMember.isCommissioner) return { error: "Only the commissioner can start a week" };

    if (league.phase !== "pre_week") {
      return { error: "League is not in pre-week phase" };
    }

    // Set bot lineups before the week locks
    await setAllBotLineupsAction(leagueId);

    await updateLeaguePhase(leagueId, "week_active");

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to start week" };
  }
}

export async function advanceWeekAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const league = await getLeagueById(leagueId);
    if (!league) return { error: "League not found" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };
    if (!currentMember.isCommissioner) return { error: "Only the commissioner can advance the week" };

    if (league.phase !== "week_active") {
      return { error: "League is not in an active week" };
    }

    if (league.currentWeek < 1 || league.currentWeek > 17) {
      return { error: "Season is not active" };
    }

    const settings = await getLeagueSettings(leagueId);
    const slotConfig = generateSlotConfig(settings);

    // Get matchups for the current week
    const weekMatchups = await getLeagueMatchups(leagueId, league.currentWeek);
    if (weekMatchups.length === 0) {
      return { error: "No matchups found for this week" };
    }

    // For mock leagues, generate mock stats if not already present
    let mockStatsMap: Map<string, number> | null = null;
    if (league.isMock) {
      const statsExist = await mockStatsExistForWeek(leagueId, league.currentWeek);
      if (!statsExist) {
        await generateMockStatsForWeek(leagueId, league.currentWeek);
      }
      // Load mock stats into a map for fast lookup
      const mockStats = await getMockPlayerStats(leagueId, league.currentWeek);
      mockStatsMap = new Map(mockStats.map((s) => [s.playerId, s.points]));
    }

    // Score each matchup
    const results: {
      team1Name: string;
      team2Name: string;
      team1Score: number;
      team2Score: number;
    }[] = [];

    for (const matchup of weekMatchups) {
      const team1Roster = await getMemberRosterWithAdp(matchup.team1MemberId);
      const team2Roster = await getMemberRosterWithAdp(matchup.team2MemberId);

      let team1Score: number;
      let team2Score: number;

      if (league.isMock && mockStatsMap) {
        // Use mock stats for scoring
        team1Score = calculateMockTeamScore(team1Roster, slotConfig.starterSlots, mockStatsMap);
        team2Score = calculateMockTeamScore(team2Roster, slotConfig.starterSlots, mockStatsMap);
      } else {
        // Use ADP-based scoring for regular leagues
        team1Score = calculateTeamScore(team1Roster, slotConfig.starterSlots);
        team2Score = calculateTeamScore(team2Roster, slotConfig.starterSlots);
      }

      await updateMatchupScores(matchup.id, team1Score, team2Score);

      const t1 = members.find((m) => m.id === matchup.team1MemberId);
      const t2 = members.find((m) => m.id === matchup.team2MemberId);

      results.push({
        team1Name: t1?.teamName || t1?.userName || t1?.userEmail || "Unknown",
        team2Name: t2?.teamName || t2?.userName || t2?.userEmail || "Unknown",
        team1Score,
        team2Score,
      });
    }

    // Advance to next week or complete the season
    if (league.currentWeek >= 17) {
      await updateLeagueWeekAndPhase(leagueId, 18, "complete");
    } else {
      await updateLeagueWeekAndPhase(leagueId, league.currentWeek + 1, "pre_week");

      // Fill any empty bot roster slots with free agents
      await fillAllBotRostersAction(leagueId);
    }

    return { success: true, results, week: league.currentWeek };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to advance week" };
  }
}
