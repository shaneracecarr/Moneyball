"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { movePlayerSchema, pickupPlayerSchema, dropAndAddSchema } from "@/lib/validations/roster";
import {
  getLeagueMembers,
  getMemberRoster,
  searchFreeAgents,
  addPlayerToRoster,
  updateRosterSlot,
  removeRosterPlayer,
  getFirstOpenBenchSlot,
  getRosterPlayerBySlot,
  getPlayerById,
  createLeagueActivityEvent,
  insertSystemChatMessage,
  getLeagueSettings,
} from "@/lib/db/queries";
import { generateSlotConfig } from "@/lib/roster-config";
import type { SlotConfig } from "@/lib/roster-config";

function isBenchSlot(slot: string) {
  return slot.startsWith("BN");
}

function isIRSlot(slot: string) {
  return slot.startsWith("IR");
}

function canPlayerFillSlot(
  playerPosition: string,
  slot: string,
  injuryStatus: string | null,
  slotConfig: SlotConfig
): { ok: boolean; error?: string } {
  if (isIRSlot(slot)) {
    if (!injuryStatus) {
      return { ok: false, error: "Only injured players can be placed on IR" };
    }
    return { ok: true };
  }

  if (isBenchSlot(slot)) {
    return { ok: true };
  }

  // Starter slot — use dynamic config
  const allowed = slotConfig.slotAllowedPositions[slot];
  if (allowed && allowed.length > 0 && !allowed.includes(playerPosition)) {
    return { ok: false, error: `${playerPosition} cannot fill ${slot} slot` };
  }
  return { ok: true };
}

async function getMemberForUser(userId: string, leagueId: string) {
  const members = await getLeagueMembers(leagueId);
  return members.find((m) => m.userId === userId) || null;
}

async function getSlotConfigForLeague(leagueId: string): Promise<SlotConfig> {
  const settings = await getLeagueSettings(leagueId);
  return generateSlotConfig(settings);
}

export async function getUserRosterAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { error: "You are not a member of this league" };

    const roster = await getMemberRoster(member.id);
    const slotConfig = await getSlotConfigForLeague(leagueId);

    const starterSet = new Set(slotConfig.starterSlots);
    const starters = roster.filter((r) => starterSet.has(r.slot));
    const bench = roster.filter((r) => r.slot.startsWith("BN"));
    const ir = roster.filter((r) => r.slot.startsWith("IR"));

    return {
      starters,
      bench,
      ir,
      memberId: member.id,
      teamName: member.teamName,
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to get roster" };
  }
}

export async function movePlayerAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const rawData = {
      leagueId: formData.get("leagueId") as string,
      rosterPlayerId: formData.get("rosterPlayerId") as string,
      targetSlot: formData.get("targetSlot") as string,
    };

    const validated = movePlayerSchema.parse(rawData);
    const member = await getMemberForUser(session.user.id, validated.leagueId);
    if (!member) return { error: "You are not a member of this league" };

    const slotConfig = await getSlotConfigForLeague(validated.leagueId);

    // Validate target slot exists in this league's config
    if (!slotConfig.allSlots.includes(validated.targetSlot)) {
      return { error: `Invalid slot: ${validated.targetSlot}` };
    }

    const roster = await getMemberRoster(member.id);
    const rosterEntry = roster.find((r) => r.id === validated.rosterPlayerId);
    if (!rosterEntry) return { error: "Player not found on your roster" };

    // Check position compatibility
    const check = canPlayerFillSlot(
      rosterEntry.playerPosition,
      validated.targetSlot,
      rosterEntry.playerInjuryStatus,
      slotConfig
    );
    if (!check.ok) return { error: check.error };

    // Check if target slot is occupied
    const occupant = roster.find((r) => r.slot === validated.targetSlot);
    if (occupant) {
      // Swap: move occupant to the source slot
      const swapCheck = canPlayerFillSlot(
        occupant.playerPosition,
        rosterEntry.slot,
        occupant.playerInjuryStatus,
        slotConfig
      );
      if (!swapCheck.ok) {
        return { error: `Cannot swap: ${swapCheck.error}` };
      }
      await updateRosterSlot(occupant.id, rosterEntry.slot);
    }

    await updateRosterSlot(validated.rosterPlayerId, validated.targetSlot);

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to move player" };
  }
}

export async function searchFreeAgentsAction(
  leagueId: string,
  options: {
    search?: string;
    position?: string;
    limit?: number;
    sortBy?: "adp" | "seasonPoints" | "avgPoints";
    includeRostered?: boolean;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in", players: [] };

    const players = await searchFreeAgents(leagueId, options);
    return { players };
  } catch (error) {
    return { error: "Failed to search free agents", players: [] };
  }
}

export async function pickupPlayerAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const rawData = {
      leagueId: formData.get("leagueId") as string,
      playerId: formData.get("playerId") as string,
    };

    const validated = pickupPlayerSchema.parse(rawData);
    const member = await getMemberForUser(session.user.id, validated.leagueId);
    if (!member) return { error: "You are not a member of this league" };

    const slotConfig = await getSlotConfigForLeague(validated.leagueId);
    const openSlot = await getFirstOpenBenchSlot(member.id, slotConfig.benchSlots);
    if (!openSlot) {
      return { error: "No open bench slots. You must drop a player first.", needsDrop: true };
    }

    await addPlayerToRoster(member.id, validated.playerId, openSlot, "free_agent");

    // Create activity feed event and system chat message
    const player = await getPlayerById(validated.playerId);
    if (player) {
      await createLeagueActivityEvent({
        leagueId: validated.leagueId,
        type: "free_agent_pickup",
        payload: JSON.stringify({
          playerName: player.fullName,
          playerPosition: player.position,
          teamName: member.teamName || "Unknown Team",
        }),
      });

      // System chat message
      const teamName = member.teamName || "A team";
      await insertSystemChatMessage(
        validated.leagueId,
        `${teamName} picked up ${player.fullName} (FA)`,
        {
          type: "free_agent_pickup",
          playerId: player.id,
          playerName: player.fullName,
          playerPosition: player.position,
          memberId: member.id,
          teamName,
        }
      );
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to pick up player" };
  }
}

export async function dropAndAddAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const rawData = {
      leagueId: formData.get("leagueId") as string,
      dropRosterPlayerId: formData.get("dropRosterPlayerId") as string,
      addPlayerId: formData.get("addPlayerId") as string,
    };

    const validated = dropAndAddSchema.parse(rawData);
    const member = await getMemberForUser(session.user.id, validated.leagueId);
    if (!member) return { error: "You are not a member of this league" };

    const roster = await getMemberRoster(member.id);
    const dropEntry = roster.find((r) => r.id === validated.dropRosterPlayerId);
    if (!dropEntry) return { error: "Player to drop not found on your roster" };

    // Remove the player
    await removeRosterPlayer(validated.dropRosterPlayerId);

    // Add to the freed slot if it's a bench slot, otherwise find first open bench
    const slotConfig = await getSlotConfigForLeague(validated.leagueId);
    const targetSlot = isBenchSlot(dropEntry.slot)
      ? dropEntry.slot
      : await getFirstOpenBenchSlot(member.id, slotConfig.benchSlots) || dropEntry.slot;

    await addPlayerToRoster(member.id, validated.addPlayerId, targetSlot, "free_agent");

    // Create activity feed event and system chat message
    const player = await getPlayerById(validated.addPlayerId);
    if (player) {
      await createLeagueActivityEvent({
        leagueId: validated.leagueId,
        type: "free_agent_pickup",
        payload: JSON.stringify({
          playerName: player.fullName,
          playerPosition: player.position,
          teamName: member.teamName || "Unknown Team",
        }),
      });

      // System chat message
      const teamName = member.teamName || "A team";
      await insertSystemChatMessage(
        validated.leagueId,
        `${teamName} picked up ${player.fullName} (FA)`,
        {
          type: "free_agent_pickup",
          playerId: player.id,
          playerName: player.fullName,
          playerPosition: player.position,
          memberId: member.id,
          teamName,
        }
      );
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to drop and add player" };
  }
}

export async function dropPlayerAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const leagueId = formData.get("leagueId") as string;
    const rosterPlayerId = formData.get("rosterPlayerId") as string;

    if (!leagueId || !rosterPlayerId) return { error: "Missing required fields" };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { error: "You are not a member of this league" };

    const roster = await getMemberRoster(member.id);
    const entry = roster.find((r) => r.id === rosterPlayerId);
    if (!entry) return { error: "Player not found on your roster" };

    await removeRosterPlayer(rosterPlayerId);

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to drop player" };
  }
}

export async function setActiveLeagueAction(leagueId: string, leagueName: string) {
  cookies().set("active_league_id", leagueId, { path: "/", httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  cookies().set("active_league_name", leagueName, { path: "/", httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
}
