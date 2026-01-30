"use server";

import { auth } from "@/auth";
import {
  getLeagueById,
  getLeagueMembers,
  isUserInLeague,
  createLeagueMember,
  createDraft,
  setDraftOrder,
  getDraftOrder,
  getDraftPicks,
  getDraftByLeagueId,
  createDraftPick,
  advanceDraftPick,
  updateDraftStatus,
  isPlayerDrafted,
  populateRosterFromDraft,
  searchAvailablePlayers,
  getUserMockLeagues,
  deleteMockLeagueData,
  upsertLeagueSettings,
  getLeagueSettings,
  getLeagueMatchups,
  createMatchups,
  deleteLeagueMatchups,
  updateMatchupScores,
  updateLeagueCurrentWeek,
  getMemberRosterWithAdp,
  getMemberRoster,
  updateRosterSlot,
  getScoredMatchups,
} from "@/lib/db/queries";
import { db } from "@/lib/db";
import { leagues, leagueMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateInviteCode } from "@/lib/utils";
import { DEFAULT_LEAGUE_SETTINGS } from "@/lib/league-settings";
import { generateSlotConfig } from "@/lib/roster-config";
import { getSnakeDraftPosition, getMemberIdForPick } from "@/lib/draft-utils";
import {
  AI_TEAM_NAMES,
  botDraftPick,
  calculateTeamScore,
  botOptimizeLineup,
} from "@/lib/mock-league-utils";

export async function createMockLeagueAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in" };
    }

    const teamName = (formData.get("teamName") as string) || "My Team";
    const numberOfTeams = Number(formData.get("numberOfTeams") || 10);
    const numberOfRounds = Number(formData.get("numberOfRounds") || 15);
    const draftPosition = Number(formData.get("draftPosition") || 0); // 0 = random
    const leagueName = (formData.get("leagueName") as string) || "Mock League";

    if (numberOfTeams < 4 || numberOfTeams > 14) {
      return { error: "Team count must be between 4 and 14" };
    }

    const inviteCode = generateInviteCode();

    // Create league with isMockLeague flag
    const result = await db
      .insert(leagues)
      .values({
        name: leagueName,
        numberOfTeams,
        inviteCode,
        createdBy: session.user.id,
        isMockLeague: true,
        currentWeek: 0,
      })
      .returning();
    const league = result[0];

    // Add user as commissioner
    const userMember = await createLeagueMember(league.id, session.user.id, teamName, true, false);

    // Add bot members
    const botMembers = [];
    for (let i = 0; i < numberOfTeams - 1; i++) {
      const bot = await createLeagueMember(
        league.id,
        null,
        AI_TEAM_NAMES[i % AI_TEAM_NAMES.length],
        false,
        true
      );
      botMembers.push(bot);
    }

    // Save default league settings
    await upsertLeagueSettings(league.id, DEFAULT_LEAGUE_SETTINGS);

    // Create draft and set order
    const draft = await createDraft(league.id, numberOfRounds);
    const allMemberIds = [userMember.id, ...botMembers.map((b) => b.id)];

    if (draftPosition >= 1 && draftPosition <= numberOfTeams) {
      // Place user at their requested draft position, shuffle bots into remaining slots
      const shuffledBots = botMembers.map((b) => b.id).sort(() => Math.random() - 0.5);
      const orderedIds: string[] = [];
      let botIdx = 0;
      for (let pos = 1; pos <= numberOfTeams; pos++) {
        if (pos === draftPosition) {
          orderedIds.push(userMember.id);
        } else {
          orderedIds.push(shuffledBots[botIdx++]);
        }
      }
      await setDraftOrder(draft.id, orderedIds);
    } else {
      // Random position
      const shuffled = [...allMemberIds].sort(() => Math.random() - 0.5);
      await setDraftOrder(draft.id, shuffled);
    }

    // Start draft immediately
    await updateDraftStatus(draft.id, "in_progress", { startedAt: new Date() });

    return { success: true, leagueId: league.id };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to create mock league" };
  }
}

export async function getMockLeagueStateAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const league = await getLeagueById(leagueId);
    if (!league || !league.isMockLeague) return { error: "Mock league not found" };

    const isMember = await isUserInLeague(session.user.id, leagueId);
    if (!isMember) return { error: "You are not a member of this league" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    const draft = await getDraftByLeagueId(leagueId);

    let draftOrder: Awaited<ReturnType<typeof getDraftOrder>> = [];
    let draftPicks: Awaited<ReturnType<typeof getDraftPicks>> = [];
    let onTheClockMemberId: string | undefined;

    if (draft) {
      draftOrder = await getDraftOrder(draft.id);
      draftPicks = await getDraftPicks(draft.id);
      if (draft.status === "in_progress") {
        onTheClockMemberId = getMemberIdForPick(
          draft.currentPick,
          league.numberOfTeams,
          draftOrder
        );
      }
    }

    // Get standings data
    const allMatchups = await getScoredMatchups(leagueId);
    const completedMatchups = allMatchups.filter(
      (m) => m.team1Score !== null && m.team2Score !== null
    );

    const standingsMap = new Map<
      string,
      { wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number }
    >();
    for (const member of members) {
      standingsMap.set(member.id, {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
    }

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

    const standings = members
      .map((m) => {
        const record = standingsMap.get(m.id) || {
          wins: 0,
          losses: 0,
          ties: 0,
          pointsFor: 0,
          pointsAgainst: 0,
        };
        return {
          memberId: m.id,
          teamName: m.teamName || m.userName || m.userEmail || "Unknown",
          isBot: m.isBot,
          isUser: m.userId === session.user.id,
          ...record,
          pointsFor: Math.round(record.pointsFor * 10) / 10,
          pointsAgainst: Math.round(record.pointsAgainst * 10) / 10,
        };
      })
      .sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return b.pointsFor - a.pointsFor;
      });

    return {
      league,
      members,
      draft,
      draftOrder,
      draftPicks,
      onTheClockMemberId,
      currentUserMemberId: currentMember?.id,
      standings,
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to get mock league state" };
  }
}

export async function makeBotDraftPicksAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const league = await getLeagueById(leagueId);
    if (!league) return { error: "League not found" };

    const draft = await getDraftByLeagueId(leagueId);
    if (!draft || draft.status !== "in_progress") {
      return { error: "Draft is not in progress" };
    }

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };

    const order = await getDraftOrder(draft.id);
    const totalPicks = draft.numberOfRounds * league.numberOfTeams;
    let currentPick = draft.currentPick;

    // Make bot picks until it's the user's turn or draft is complete
    while (currentPick <= totalPicks) {
      const pickingMemberId = getMemberIdForPick(currentPick, league.numberOfTeams, order);
      if (!pickingMemberId) break;

      // Check if this is the user's turn
      if (pickingMemberId === currentMember.id) break;

      // Check if this is a bot
      const pickingMember = members.find((m) => m.id === pickingMemberId);
      if (!pickingMember?.isBot) break;

      // Get available players
      const availablePlayers = await searchAvailablePlayers(draft.id, { limit: 200 });
      if (availablePlayers.length === 0) break;

      // Bot makes a pick
      const { round } = getSnakeDraftPosition(currentPick, league.numberOfTeams);
      const selected = botDraftPick(availablePlayers, round, {});
      if (!selected) break;

      await createDraftPick(draft.id, selected.id, pickingMemberId, currentPick, round);

      if (currentPick >= totalPicks) {
        // Draft complete
        await updateDraftStatus(draft.id, "completed", {
          completedAt: new Date(),
          currentPick,
        });
        await populateRosterFromDraft(draft.id);

        // Auto-generate schedule
        await autoGenerateSchedule(leagueId, members.map((m) => m.id));
        await updateLeagueCurrentWeek(leagueId, 1);

        return { success: true, draftComplete: true };
      }

      currentPick++;
      await advanceDraftPick(draft.id, currentPick);
    }

    return { success: true, draftComplete: false };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to make bot picks" };
  }
}

export async function makeUserDraftPickAction(leagueId: string, playerId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const league = await getLeagueById(leagueId);
    if (!league) return { error: "League not found" };

    const draft = await getDraftByLeagueId(leagueId);
    if (!draft || draft.status !== "in_progress") {
      return { error: "Draft is not in progress" };
    }

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };

    const order = await getDraftOrder(draft.id);
    const expectedMemberId = getMemberIdForPick(
      draft.currentPick,
      league.numberOfTeams,
      order
    );

    if (expectedMemberId !== currentMember.id) {
      return { error: "It is not your turn to pick" };
    }

    const alreadyDrafted = await isPlayerDrafted(draft.id, playerId);
    if (alreadyDrafted) return { error: "Player has already been drafted" };

    const { round } = getSnakeDraftPosition(draft.currentPick, league.numberOfTeams);
    await createDraftPick(draft.id, playerId, currentMember.id, draft.currentPick, round);

    const totalPicks = draft.numberOfRounds * league.numberOfTeams;
    if (draft.currentPick >= totalPicks) {
      await updateDraftStatus(draft.id, "completed", {
        completedAt: new Date(),
        currentPick: draft.currentPick,
      });
      await populateRosterFromDraft(draft.id);
      await autoGenerateSchedule(leagueId, members.map((m) => m.id));
      await updateLeagueCurrentWeek(leagueId, 1);
      return { success: true, draftComplete: true };
    }

    await advanceDraftPick(draft.id, draft.currentPick + 1);

    // Now make bot picks
    const botResult = await makeBotDraftPicksAction(leagueId);
    return {
      success: true,
      draftComplete: botResult.draftComplete ?? false,
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to make pick" };
  }
}

export async function simulateWeekAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const league = await getLeagueById(leagueId);
    if (!league || !league.isMockLeague) return { error: "Mock league not found" };

    if (league.currentWeek < 1 || league.currentWeek > 17) {
      return { error: "Season is not active" };
    }

    const members = await getLeagueMembers(leagueId);
    const settings = await getLeagueSettings(leagueId);
    const slotConfig = generateSlotConfig(settings);

    // Bot lineup optimization
    for (const member of members) {
      if (!member.isBot) continue;
      const roster = await getMemberRosterWithAdp(member.id);
      const moves = botOptimizeLineup(roster, slotConfig);
      for (const move of moves) {
        // Swap slots for the two players
        const playerInTarget = roster.find((r) => r.slot === move.toSlot);
        const playerMoving = roster.find((r) => r.slot === move.fromSlot);
        if (playerMoving) {
          await updateRosterSlot(playerMoving.id, move.toSlot);
        }
        if (playerInTarget) {
          await updateRosterSlot(playerInTarget.id, move.fromSlot);
        }
      }
    }

    // Get matchups for the current week
    const weekMatchups = await getLeagueMatchups(leagueId, league.currentWeek);
    if (weekMatchups.length === 0) {
      return { error: "No matchups found for this week" };
    }

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

      const team1Member = members.find((m) => m.id === matchup.team1MemberId);
      const team2Member = members.find((m) => m.id === matchup.team2MemberId);

      results.push({
        team1Name: team1Member?.teamName || team1Member?.userName || "Unknown",
        team2Name: team2Member?.teamName || team2Member?.userName || "Unknown",
        team1Score,
        team2Score,
      });
    }

    // Advance week
    const nextWeek = league.currentWeek + 1;
    if (nextWeek > 17) {
      await updateLeagueCurrentWeek(leagueId, 18); // Season over
    } else {
      await updateLeagueCurrentWeek(leagueId, nextWeek);
    }

    return { success: true, results, week: league.currentWeek };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to simulate week" };
  }
}

export async function getUserMockLeaguesAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { leagues: [] };

    const mockLeagues = await getUserMockLeagues(session.user.id);

    // Get draft status for each league
    const leaguesWithStatus = await Promise.all(
      mockLeagues.map(async (league) => {
        const draft = await getDraftByLeagueId(league.id);
        return {
          ...league,
          draftStatus: draft?.status || "scheduled",
        };
      })
    );

    return { leagues: leaguesWithStatus };
  } catch (error) {
    return { leagues: [], error: "Failed to fetch mock leagues" };
  }
}

export async function deleteMockLeagueAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const league = await getLeagueById(leagueId);
    if (!league || !league.isMockLeague) return { error: "Mock league not found" };

    const isMember = await isUserInLeague(session.user.id, leagueId);
    if (!isMember) return { error: "You are not a member of this league" };

    await deleteMockLeagueData(leagueId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to delete mock league" };
  }
}

export async function searchMockDraftPlayersAction(
  leagueId: string,
  options: { search?: string; position?: string; limit?: number }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in", players: [] };

    const draft = await getDraftByLeagueId(leagueId);
    if (!draft) return { error: "Draft not found", players: [] };

    const players = await searchAvailablePlayers(draft.id, options);
    return { players };
  } catch (error) {
    return { error: "Failed to search players", players: [] };
  }
}

// Internal helper to generate round-robin schedule
function generateRoundRobinSchedule(
  memberIds: string[]
): { team1: string; team2: string }[][] {
  const teams = [...memberIds];
  if (teams.length % 2 !== 0) {
    teams.push("BYE");
  }

  const n = teams.length;
  const totalRounds = n - 1;
  const schedule: { team1: string; team2: string }[][] = [];

  for (let round = 0; round < totalRounds; round++) {
    const roundMatchups: { team1: string; team2: string }[] = [];

    for (let i = 0; i < n / 2; i++) {
      const home =
        i === 0 ? teams[0] : teams[n - 1 - ((round + i - 1) % (n - 1))];
      const away = teams[((round + i) % (n - 1)) + 1];

      if (home === "BYE" || away === "BYE") continue;
      roundMatchups.push({ team1: home, team2: away });
    }

    schedule.push(roundMatchups);
  }

  return schedule;
}

async function autoGenerateSchedule(leagueId: string, memberIds: string[]) {
  await deleteLeagueMatchups(leagueId);

  const roundRobinWeeks = generateRoundRobinSchedule(memberIds);
  const allMatchups: {
    leagueId: string;
    week: number;
    team1MemberId: string;
    team2MemberId: string;
  }[] = [];

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
}
