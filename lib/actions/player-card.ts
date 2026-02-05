"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { players, playerGameStats } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getLeagueMembers, getMemberRoster, isPlayerOnTradeBlock, isPlayerOnWatchlist } from "@/lib/db/queries";

export async function getPlayerCardDataAction(playerId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const player = await db
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1);

    if (!player[0]) return { error: "Player not found" };

    const cookieStore = cookies();
    const activeLeagueId = cookieStore.get("active_league_id")?.value || null;

    let ownerTeamName: string | null = null;
    let isOwnedByCurrentUser = false;
    let rosterPlayerId: string | null = null;
    let isOnTradeBlock = false;
    let isOnWatchlist = false;
    let currentMemberId: string | null = null;

    if (activeLeagueId) {
      const members = await getLeagueMembers(activeLeagueId);
      const currentMember = members.find((m) => m.userId === session.user.id);
      currentMemberId = currentMember?.id || null;

      for (const member of members) {
        const roster = await getMemberRoster(member.id);
        const rosterEntry = roster.find((r) => r.playerId === playerId);
        if (rosterEntry) {
          ownerTeamName = member.teamName || member.userName || member.userEmail;
          rosterPlayerId = rosterEntry.id;
          if (member.userId === session.user.id) {
            isOwnedByCurrentUser = true;
          }
          break;
        }
      }

      // Check trade block and watchlist status
      if (currentMemberId) {
        const [onTradeBlock, onWatchlist] = await Promise.all([
          isPlayerOnTradeBlock(currentMemberId, playerId),
          isPlayerOnWatchlist(currentMemberId, playerId),
        ]);
        isOnTradeBlock = onTradeBlock;
        isOnWatchlist = onWatchlist;
      }
    }

    // Fetch historical game stats for this player
    const gameStats = await db
      .select()
      .from(playerGameStats)
      .where(eq(playerGameStats.playerId, playerId))
      .orderBy(desc(playerGameStats.season), desc(playerGameStats.week));

    return {
      player: {
        id: player[0].id,
        fullName: player[0].fullName,
        firstName: player[0].firstName,
        lastName: player[0].lastName,
        team: player[0].team,
        position: player[0].position,
        status: player[0].status,
        injuryStatus: player[0].injuryStatus,
        age: player[0].age,
        yearsExp: player[0].yearsExp,
        number: player[0].number,
        height: player[0].height,
        weight: player[0].weight,
        college: player[0].college,
        headshotUrl: player[0].headshotUrl,
        seasonPoints: player[0].seasonPoints,
        adp: player[0].adp,
      },
      gameStats: gameStats.map((g) => ({
        gameId: g.gameId,
        season: g.season,
        week: g.week,
        opponent: g.opponent,
        isHome: g.isHome,
        passAttempts: g.passAttempts,
        passCompletions: g.passCompletions,
        passYards: g.passYards,
        passTds: g.passTds,
        passInts: g.passInts,
        rushAttempts: g.rushAttempts,
        rushYards: g.rushYards,
        rushTds: g.rushTds,
        targets: g.targets,
        receptions: g.receptions,
        recYards: g.recYards,
        recTds: g.recTds,
        fgMade: g.fgMade,
        fgAttempted: g.fgAttempted,
        xpMade: g.xpMade,
        xpAttempted: g.xpAttempted,
        fantasyPointsStandard: g.fantasyPointsStandard,
        fantasyPointsPpr: g.fantasyPointsPpr,
        fantasyPointsHalfPpr: g.fantasyPointsHalfPpr,
      })),
      ownerTeamName,
      isOwnedByCurrentUser,
      rosterPlayerId,
      activeLeagueId,
      isOnTradeBlock,
      isOnWatchlist,
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to get player data" };
  }
}
