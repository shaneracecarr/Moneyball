"use server";

import { auth } from "@/lib/supabase/server";
import { getLeagueMembers, getScoredMatchups } from "@/lib/db/queries";

export type TeamStanding = {
  memberId: string;
  teamName: string;
  userName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
};

export type TeamRecord = {
  memberId: string;
  wins: number;
  losses: number;
  ties: number;
};

// Get just the records (wins/losses/ties) for all teams - useful for matchup display
export async function getTeamRecordsAction(leagueId: string): Promise<{ records: Map<string, TeamRecord> } | { error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const members = await getLeagueMembers(leagueId);
    const allMatchups = await getScoredMatchups(leagueId);

    const completedMatchups = allMatchups.filter(
      (m) => m.team1Score !== null && m.team2Score !== null
    );

    const recordsMap = new Map<string, TeamRecord>();
    for (const member of members) {
      recordsMap.set(member.id, {
        memberId: member.id,
        wins: 0,
        losses: 0,
        ties: 0,
      });
    }

    for (const m of completedMatchups) {
      const t1 = recordsMap.get(m.team1MemberId);
      const t2 = recordsMap.get(m.team2MemberId);
      const s1 = m.team1Score!;
      const s2 = m.team2Score!;

      if (t1) {
        if (s1 > s2) t1.wins++;
        else if (s1 < s2) t1.losses++;
        else t1.ties++;
      }

      if (t2) {
        if (s2 > s1) t2.wins++;
        else if (s2 < s1) t2.losses++;
        else t2.ties++;
      }
    }

    return { records: recordsMap };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to get team records" };
  }
}

export async function getStandingsAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };

    const allMatchups = await getScoredMatchups(leagueId);

    // Only include matchups where both scores are present (completed)
    const completedMatchups = allMatchups.filter(
      (m) => m.team1Score !== null && m.team2Score !== null
    );

    // Initialize standings for every member
    const standingsMap = new Map<string, TeamStanding>();
    for (const member of members) {
      standingsMap.set(member.id, {
        memberId: member.id,
        teamName: member.teamName || member.userName || member.userEmail || "Unknown",
        userName: member.userName || member.userEmail || "Unknown",
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
    }

    // Aggregate results from completed matchups
    for (const m of completedMatchups) {
      const t1 = standingsMap.get(m.team1MemberId);
      const t2 = standingsMap.get(m.team2MemberId);
      const s1 = m.team1Score!;
      const s2 = m.team2Score!;

      if (t1) {
        t1.pointsFor += s1;
        t1.pointsAgainst += s2;
        if (s1 > s2) t1.wins++;
        else if (s1 < s2) t1.losses++;
        else t1.ties++;
      }

      if (t2) {
        t2.pointsFor += s2;
        t2.pointsAgainst += s1;
        if (s2 > s1) t2.wins++;
        else if (s2 < s1) t2.losses++;
        else t2.ties++;
      }
    }

    // Sort: wins desc, losses asc, pointsFor desc
    const standings = Array.from(standingsMap.values()).sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return b.pointsFor - a.pointsFor;
    });

    return { standings, completedWeeks: completedMatchups.length > 0 };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to load standings" };
  }
}
