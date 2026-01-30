"use server";

import { auth } from "@/auth";
import {
  getLeagueMembers,
  getLeagueMatchups,
  getUserMatchup,
  getMatchupCountByLeague,
  deleteLeagueMatchups,
  createMatchups,
  getMemberRoster,
  getDraftByLeagueId,
  updateLeagueWeekAndPhase,
} from "@/lib/db/queries";

function generateRoundRobinSchedule(memberIds: string[]): { team1: string; team2: string }[][] {
  const teams = [...memberIds];
  // If odd number of teams, add a "BYE" placeholder
  if (teams.length % 2 !== 0) {
    teams.push("BYE");
  }

  const n = teams.length;
  const totalRounds = n - 1;
  const schedule: { team1: string; team2: string }[][] = [];

  // Classic circle method: fix teams[0], rotate the rest
  for (let round = 0; round < totalRounds; round++) {
    const roundMatchups: { team1: string; team2: string }[] = [];

    for (let i = 0; i < n / 2; i++) {
      const home = i === 0 ? teams[0] : teams[n - 1 - ((round + i - 1) % (n - 1))];
      const away = teams[((round + i) % (n - 1)) + 1];

      // Skip BYE matchups
      if (home === "BYE" || away === "BYE") continue;

      roundMatchups.push({ team1: home, team2: away });
    }

    schedule.push(roundMatchups);
  }

  return schedule;
}

export async function generateScheduleAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };
    if (!currentMember.isCommissioner) return { error: "Only the commissioner can generate the schedule" };

    // Check draft is completed
    const draft = await getDraftByLeagueId(leagueId);
    if (!draft || draft.status !== "completed") {
      return { error: "The draft must be completed before generating a schedule" };
    }

    // Delete existing matchups if regenerating
    await deleteLeagueMatchups(leagueId);

    const memberIds = members.map((m) => m.id);
    const roundRobinWeeks = generateRoundRobinSchedule(memberIds);

    // Generate 17 weeks by cycling through the round-robin schedule
    const allMatchups: { leagueId: string; week: number; team1MemberId: string; team2MemberId: string }[] = [];

    for (let week = 1; week <= 17; week++) {
      const roundIndex = (week - 1) % roundRobinWeeks.length;
      const weekMatchups = roundRobinWeeks[roundIndex];
      for (const matchup of weekMatchups) {
        allMatchups.push({
          leagueId,
          week,
          team1MemberId: matchup.team1,
          team2MemberId: matchup.team2,
        });
      }
    }

    await createMatchups(allMatchups);
    await updateLeagueWeekAndPhase(leagueId, 1, "pre_week");

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to generate schedule" };
  }
}

export async function getMatchupAction(leagueId: string, week: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };

    const matchup = await getUserMatchup(currentMember.id, week);
    if (!matchup) {
      return { matchup: null, userRoster: [], opponentRoster: [], userTeam: null, opponentTeam: null };
    }

    const isTeam1 = matchup.team1MemberId === currentMember.id;
    const userMemberId = isTeam1 ? matchup.team1MemberId : matchup.team2MemberId;
    const opponentMemberId = isTeam1 ? matchup.team2MemberId : matchup.team1MemberId;

    const opponentMember = members.find((m) => m.id === opponentMemberId);

    const [userRoster, opponentRoster] = await Promise.all([
      getMemberRoster(userMemberId),
      getMemberRoster(opponentMemberId),
    ]);

    return {
      matchup,
      userRoster,
      opponentRoster,
      userTeam: {
        memberId: currentMember.id,
        teamName: currentMember.teamName,
        userName: currentMember.userName || currentMember.userEmail,
      },
      opponentTeam: {
        memberId: opponentMemberId,
        teamName: opponentMember?.teamName || null,
        userName: opponentMember?.userName || opponentMember?.userEmail || "Unknown",
      },
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to get matchup" };
  }
}

export async function getLeagueScheduleAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };

    const allMatchups = await getLeagueMatchups(leagueId);
    const hasSchedule = allMatchups.length > 0;

    return { matchups: allMatchups, members, hasSchedule };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to get schedule" };
  }
}
