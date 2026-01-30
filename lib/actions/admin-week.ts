"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { leagues, users } from "@/lib/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import {
    getLeagueMatchups,
    getMemberRosterWithAdp,
    updateMatchupScores,
    updateLeagueWeekAndPhase,
    updateLeaguePhase,
    getLeagueSettings,
    getLeagueMembers,
} from "@/lib/db/queries";
import { generateSlotConfig } from "@/lib/roster-config";
import { calculateTeamScore } from "@/lib/mock-league-utils";

// Check if current user is admin
// TODO: Re-enable proper admin check later
async function isCurrentUserAdmin(): Promise<boolean> {
    const session = await auth();
    if (!session?.user?.id) return false;

    // For now, all authenticated users have admin access
    return true;
}

// Get all active leagues (ones that have a schedule and are in season)
async function getActiveLeagues() {
    return db
        .select({
            id: leagues.id,
            name: leagues.name,
            currentWeek: leagues.currentWeek,
            phase: leagues.phase,
        })
        .from(leagues)
        .where(
            and(
                eq(leagues.isMockLeague, false),
                inArray(leagues.phase, ["pre_week", "week_active"])
            )
        );
}

// Admin action: Start the current week for all leagues
export async function adminStartWeekAction() {
    try {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return { error: "Only site admins can perform this action" };
        }

        const activeLeagues = await getActiveLeagues();
        const preWeekLeagues = activeLeagues.filter(l => l.phase === "pre_week");

        if (preWeekLeagues.length === 0) {
            return { error: "No leagues are in pre-week phase" };
        }

        // Start week for all pre_week leagues
        for (const league of preWeekLeagues) {
            await updateLeaguePhase(league.id, "week_active");
        }

        return {
            success: true,
            message: `Started week for ${preWeekLeagues.length} league(s)`,
            leaguesUpdated: preWeekLeagues.length,
        };
    } catch (error) {
        if (error instanceof Error) return { error: error.message };
        return { error: "Failed to start week" };
    }
}

// Admin action: Score and advance all leagues to the next week
export async function adminAdvanceWeekAction() {
    try {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return { error: "Only site admins can perform this action" };
        }

        const activeLeagues = await getActiveLeagues();
        const weekActiveLeagues = activeLeagues.filter(l => l.phase === "week_active");

        if (weekActiveLeagues.length === 0) {
            return { error: "No leagues are in active week phase" };
        }

        const results: {
            leagueId: string;
            leagueName: string;
            week: number;
            matchupsScored: number;
        }[] = [];

        for (const league of weekActiveLeagues) {
            if (league.currentWeek < 1 || league.currentWeek > 17) {
                continue;
            }

            const settings = await getLeagueSettings(league.id);
            const slotConfig = generateSlotConfig(settings);
            const members = await getLeagueMembers(league.id);

            // Get matchups for the current week
            const weekMatchups = await getLeagueMatchups(league.id, league.currentWeek);

            if (weekMatchups.length === 0) {
                continue;
            }

            // Score each matchup
            for (const matchup of weekMatchups) {
                const team1Roster = await getMemberRosterWithAdp(matchup.team1MemberId);
                const team2Roster = await getMemberRosterWithAdp(matchup.team2MemberId);

                const team1Score = calculateTeamScore(team1Roster, slotConfig.starterSlots);
                const team2Score = calculateTeamScore(team2Roster, slotConfig.starterSlots);

                await updateMatchupScores(matchup.id, team1Score, team2Score);
            }

            // Advance to next week or complete the season
            if (league.currentWeek >= 17) {
                await updateLeagueWeekAndPhase(league.id, 18, "complete");
            } else {
                await updateLeagueWeekAndPhase(league.id, league.currentWeek + 1, "pre_week");
            }

            results.push({
                leagueId: league.id,
                leagueName: league.name,
                week: league.currentWeek,
                matchupsScored: weekMatchups.length,
            });
        }

        return {
            success: true,
            message: `Scored and advanced ${results.length} league(s)`,
            results,
        };
    } catch (error) {
        if (error instanceof Error) return { error: error.message };
        return { error: "Failed to advance week" };
    }
}

// Get global week status for admin display
export async function getGlobalWeekStatusAction() {
    try {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return { error: "Only site admins can view this" };
        }

        const activeLeagues = await getActiveLeagues();

        // Get counts by phase
        const preWeekCount = activeLeagues.filter(l => l.phase === "pre_week").length;
        const weekActiveCount = activeLeagues.filter(l => l.phase === "week_active").length;

        // Get the most common current week
        const weekCounts: Record<number, number> = {};
        for (const league of activeLeagues) {
            weekCounts[league.currentWeek] = (weekCounts[league.currentWeek] || 0) + 1;
        }

        let currentWeek = 1;
        let maxCount = 0;
        for (const weekStr of Object.keys(weekCounts)) {
            const week = parseInt(weekStr, 10);
            const count = weekCounts[week];
            if (count > maxCount) {
                currentWeek = week;
                maxCount = count;
            }
        }

        return {
            currentWeek,
            totalActiveLeagues: activeLeagues.length,
            preWeekCount,
            weekActiveCount,
            isAdmin: true,
        };
    } catch (error) {
        return { error: "Failed to get week status" };
    }
}

// Check if user is admin (for UI display)
export async function checkIsAdminAction() {
    return { isAdmin: await isCurrentUserAdmin() };
}
