"use server";

import { auth } from "@/auth";
import {
  getLeagueById,
  getLeagueMembers,
  getLeagueSettings,
  getLeagueMatchups,
  getMemberRosterWithAdp,
  updateMatchupScores,
  updateLeagueWeekAndPhase,
  updateLeaguePhase,
} from "@/lib/db/queries";
import { generateSlotConfig } from "@/lib/roster-config";
import { calculateTeamScore } from "@/lib/mock-league-utils";

export async function startWeekAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const league = await getLeagueById(leagueId);
    if (!league) return { error: "League not found" };
    if (league.isMockLeague) return { error: "Use mock league actions for mock leagues" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };
    if (!currentMember.isCommissioner) return { error: "Only the commissioner can start a week" };

    if (league.phase !== "pre_week") {
      return { error: "League is not in pre-week phase" };
    }

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
    if (league.isMockLeague) return { error: "Use mock league actions for mock leagues" };

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

      const team1Score = calculateTeamScore(team1Roster, slotConfig.starterSlots);
      const team2Score = calculateTeamScore(team2Roster, slotConfig.starterSlots);

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
    }

    return { success: true, results, week: league.currentWeek };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to advance week" };
  }
}
