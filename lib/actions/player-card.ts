"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getPlayerById, getLeagueMembers, getMemberRoster } from "@/lib/db/queries";

export async function getPlayerCardDataAction(playerId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const player = await getPlayerById(playerId);
    if (!player) return { error: "Player not found" };

    const cookieStore = cookies();
    const activeLeagueId = cookieStore.get("active_league_id")?.value || null;

    let ownerTeamName: string | null = null;
    let isOwnedByCurrentUser = false;
    let rosterPlayerId: string | null = null;

    if (activeLeagueId) {
      const members = await getLeagueMembers(activeLeagueId);

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
    }

    return {
      player: {
        id: player.id,
        fullName: player.fullName,
        firstName: player.firstName,
        lastName: player.lastName,
        team: player.team,
        position: player.position,
        status: player.status,
        injuryStatus: player.injuryStatus,
        age: player.age,
        yearsExp: player.yearsExp,
        number: player.number,
        height: player.height,
        weight: player.weight,
        college: player.college,
        headshotUrl: player.headshotUrl,
        seasonPoints: player.seasonPoints,
        rawStats: player.rawStats,
      },
      ownerTeamName,
      isOwnedByCurrentUser,
      rosterPlayerId,
      activeLeagueId,
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to get player data" };
  }
}
