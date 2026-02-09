"use server";

import { auth } from "@/lib/supabase/server";
import {
  getLeagueById,
  getLeagueMembers,
  getAllRosteredPlayerIds,
  createMockPlayerStatsBatch,
  mockStatsExistForWeek,
  getMockPlayerStats,
} from "@/lib/db/queries";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

// Position-based score ranges for mock stats
const SCORE_RANGES: Record<string, { min: number; max: number }> = {
  QB: { min: 10, max: 30 },
  RB: { min: 5, max: 25 },
  WR: { min: 5, max: 25 },
  TE: { min: 3, max: 15 },
  K: { min: 5, max: 15 },
  DEF: { min: 0, max: 20 },
};

// Probability of being on bye (roughly 1/14 teams per week in real NFL)
const BYE_PROBABILITY = 0.07;
// Probability of being injured
const INJURY_PROBABILITY = 0.05;

/**
 * Generate a random score based on position
 */
function generateRandomScore(position: string): number {
  const range = SCORE_RANGES[position] || { min: 0, max: 10 };
  const score = range.min + Math.random() * (range.max - range.min);
  // Round to 1 decimal place
  return Math.round(score * 10) / 10;
}

/**
 * Generate mock stats for all rostered players in a league for a specific week
 */
export async function generateMockStatsForWeekAction(leagueId: string, week: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const league = await getLeagueById(leagueId);
    if (!league) return { error: "League not found" };

    if (!league.isMock) return { error: "This is not a mock league" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };
    if (!currentMember.isCommissioner) return { error: "Only the commissioner can generate mock stats" };

    // Check if stats already exist for this week
    const statsExist = await mockStatsExistForWeek(leagueId, week);
    if (statsExist) {
      return { error: "Stats already exist for this week" };
    }

    // Get all rostered player IDs
    const rosteredPlayerIds = await getAllRosteredPlayerIds(leagueId);
    if (rosteredPlayerIds.length === 0) {
      return { error: "No players are rostered in this league" };
    }

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
    const numByeTeams = 2 + Math.floor(Math.random() * 2); // 2-3 teams
    const shuffledTeams = allTeams.sort(() => Math.random() - 0.5);
    const byeTeams = new Set(shuffledTeams.slice(0, numByeTeams));

    // Generate stats for each rostered player
    const statsToCreate = playerDetails.map((player) => {
      const isOnBye = player.team ? byeTeams.has(player.team) : false;
      const isInjured = !isOnBye && Math.random() < INJURY_PROBABILITY;

      // Players on bye or injured get 0 points
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

    const byeCount = statsToCreate.filter((s) => s.isOnBye).length;
    const injuredCount = statsToCreate.filter((s) => s.isInjured).length;

    return {
      success: true,
      generated: statsToCreate.length,
      byeCount,
      injuredCount,
      byeTeams: Array.from(byeTeams),
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to generate mock stats" };
  }
}

/**
 * Get mock stats for a specific week (for display purposes)
 */
export async function getMockStatsForWeekAction(leagueId: string, week: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const league = await getLeagueById(leagueId);
    if (!league) return { error: "League not found" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };

    const stats = await getMockPlayerStats(leagueId, week);
    return { stats };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to get mock stats" };
  }
}
