"use server";

import {
  getLeagueMembers,
  getLeagueBotMembers,
  getMemberRoster,
  getMemberRosterWithAdp,
  updateRosterSlot,
  addPlayerToRoster,
  searchFreeAgents,
  getLeagueSettings,
  getTradeById,
  getTradeParticipants,
  getTradeItems,
  updateParticipantDecision,
  updateTradeStatus,
  createNotification,
  markNotificationsRead,
  removeRosterPlayer,
  getFirstOpenBenchSlot,
  getRosterPlayerByPlayerAndMember,
  createLeagueActivityEvent,
  insertSystemChatMessage,
  getMemberById,
} from "@/lib/db/queries";
import { generateSlotConfig } from "@/lib/roster-config";
import type { SlotConfig } from "@/lib/roster-config";

/**
 * Set optimal lineup for a bot team based on ADP.
 * Puts highest ADP (lowest number = best) players in starter slots.
 */
export async function setBotLineupAction(memberId: string, leagueId: string) {
  try {
    const member = await getMemberById(memberId);
    if (!member || !member.isBot) {
      return { error: "Not a bot member" };
    }

    const settings = await getLeagueSettings(leagueId);
    const slotConfig = generateSlotConfig(settings);

    // Get roster with ADP
    const roster = await getMemberRosterWithAdp(memberId);
    if (roster.length === 0) {
      return { success: true, message: "Empty roster" };
    }

    // Sort by ADP (lower = better), nulls last
    const sortedByAdp = [...roster].sort((a, b) => {
      if (a.playerAdp === null && b.playerAdp === null) return 0;
      if (a.playerAdp === null) return 1;
      if (b.playerAdp === null) return -1;
      return a.playerAdp - b.playerAdp;
    });

    // Track which slots we've filled and which players we've assigned
    const assignedPlayers = new Set<string>();
    const filledSlots = new Set<string>();
    const moves: { rosterId: string; fromSlot: string; toSlot: string }[] = [];

    // First pass: assign best players to starter slots by position
    for (const starterSlot of slotConfig.starterSlots) {
      const allowedPositions = slotConfig.slotAllowedPositions[starterSlot] || [];

      // Find best unassigned player that can fill this slot
      const candidate = sortedByAdp.find((p) => {
        if (assignedPlayers.has(p.id)) return false;
        if (allowedPositions.length === 0) return true; // Any position allowed
        return allowedPositions.includes(p.playerPosition);
      });

      if (candidate) {
        assignedPlayers.add(candidate.id);
        filledSlots.add(starterSlot);
        if (candidate.slot !== starterSlot) {
          moves.push({
            rosterId: candidate.id,
            fromSlot: candidate.slot,
            toSlot: starterSlot,
          });
        }
      }
    }

    // Second pass: put remaining players on bench
    const remainingPlayers = sortedByAdp.filter((p) => !assignedPlayers.has(p.id));
    for (const player of remainingPlayers) {
      // Find first open bench slot
      const benchSlot = slotConfig.benchSlots.find((slot) => !filledSlots.has(slot));
      if (benchSlot) {
        filledSlots.add(benchSlot);
        if (player.slot !== benchSlot) {
          moves.push({
            rosterId: player.id,
            fromSlot: player.slot,
            toSlot: benchSlot,
          });
        }
      }
    }

    // Execute moves - need to be careful about swaps
    // Simple approach: clear all slots first by moving to temp, then assign
    // Actually, we'll just update each slot directly
    for (const move of moves) {
      await updateRosterSlot(move.rosterId, move.toSlot);
    }

    return { success: true, movesMade: moves.length };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to set bot lineup" };
  }
}

/**
 * Set lineups for all bots in a league.
 * Called when week starts or advances.
 */
export async function setAllBotLineupsAction(leagueId: string) {
  try {
    const botMembers = await getLeagueBotMembers(leagueId);
    const results: { memberId: string; success: boolean; error?: string }[] = [];

    for (const bot of botMembers) {
      const result = await setBotLineupAction(bot.id, leagueId);
      results.push({
        memberId: bot.id,
        success: !result.error,
        error: result.error,
      });
    }

    return { success: true, results };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to set bot lineups" };
  }
}

/**
 * Have a bot pick up free agents to fill empty roster slots.
 * Picks best available by ADP.
 */
export async function botFillRosterAction(memberId: string, leagueId: string) {
  try {
    const member = await getMemberById(memberId);
    if (!member || !member.isBot) {
      return { error: "Not a bot member" };
    }

    const settings = await getLeagueSettings(leagueId);
    const slotConfig = generateSlotConfig(settings);
    const roster = await getMemberRoster(memberId);

    // Find empty bench slots
    const occupiedSlots = new Set(roster.map((r) => r.slot));
    const emptyBenchSlots = slotConfig.benchSlots.filter((slot) => !occupiedSlots.has(slot));

    if (emptyBenchSlots.length === 0) {
      return { success: true, message: "Roster is full" };
    }

    // Get best available free agents
    const freeAgents = await searchFreeAgents(leagueId, { limit: emptyBenchSlots.length });
    const pickups: { playerName: string; slot: string }[] = [];

    for (let i = 0; i < Math.min(emptyBenchSlots.length, freeAgents.length); i++) {
      const player = freeAgents[i];
      const slot = emptyBenchSlots[i];

      await addPlayerToRoster(memberId, player.id, slot, "free_agent");

      // Create activity feed event
      await createLeagueActivityEvent({
        leagueId,
        type: "free_agent_pickup",
        payload: JSON.stringify({
          playerName: player.fullName,
          playerPosition: player.position,
          teamName: member.teamName || "Bot",
        }),
      });

      // System chat message
      await insertSystemChatMessage(
        leagueId,
        `${member.teamName || "Bot"} picked up ${player.fullName} (FA)`,
        {
          type: "free_agent_pickup",
          playerId: player.id,
          playerName: player.fullName,
          playerPosition: player.position,
          memberId: member.id,
          teamName: member.teamName || "Bot",
        }
      );

      pickups.push({ playerName: player.fullName, slot });
    }

    return { success: true, pickups };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to fill bot roster" };
  }
}

/**
 * Fill rosters for all bots in a league.
 */
export async function fillAllBotRostersAction(leagueId: string) {
  try {
    const botMembers = await getLeagueBotMembers(leagueId);
    const results: { memberId: string; success: boolean; pickups?: number }[] = [];

    for (const bot of botMembers) {
      const result = await botFillRosterAction(bot.id, leagueId);
      results.push({
        memberId: bot.id,
        success: !result.error,
        pickups: result.pickups?.length || 0,
      });
    }

    return { success: true, results };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to fill bot rosters" };
  }
}

/**
 * Have a bot respond to a trade proposal.
 * Simple logic: accept if receiving higher total ADP value (lower ADP = more valuable)
 */
export async function botRespondToTradeAction(tradeId: string, botMemberId: string) {
  try {
    const member = await getMemberById(botMemberId);
    if (!member || !member.isBot) {
      return { error: "Not a bot member" };
    }

    const trade = await getTradeById(tradeId);
    if (!trade || trade.status !== "proposed") {
      return { error: "Trade not found or not pending" };
    }

    const participants = await getTradeParticipants(tradeId);
    const botParticipant = participants.find(
      (p) => p.memberId === botMemberId && p.role === "recipient"
    );

    if (!botParticipant || botParticipant.decision !== "pending") {
      return { error: "Bot is not a pending recipient in this trade" };
    }

    const items = await getTradeItems(tradeId);

    // Calculate ADP value bot is receiving vs giving away
    // Lower ADP = better player, so we sum up ADPs
    // Bot wants to RECEIVE lower total ADP and GIVE AWAY higher total ADP
    let receivingAdpSum = 0;
    let givingAdpSum = 0;
    let receivingCount = 0;
    let givingCount = 0;

    for (const item of items) {
      // Get player ADP from the item (we need to fetch it)
      const roster = await getMemberRosterWithAdp(item.fromMemberId);
      const rosterPlayer = roster.find((r) => r.playerId === item.playerId);
      const adp = rosterPlayer?.playerAdp ?? 999; // Default high ADP for unknown

      if (item.toMemberId === botMemberId) {
        // Bot is receiving this player
        receivingAdpSum += adp;
        receivingCount++;
      } else if (item.fromMemberId === botMemberId) {
        // Bot is giving away this player
        givingAdpSum += adp;
        givingCount++;
      }
    }

    // Calculate average ADP (if counts differ, average is fairer)
    const receivingAvgAdp = receivingCount > 0 ? receivingAdpSum / receivingCount : 999;
    const givingAvgAdp = givingCount > 0 ? givingAdpSum / givingCount : 999;

    // Accept if receiving better (lower) average ADP
    // Add small tolerance - accept if roughly equal or better
    const shouldAccept = receivingAvgAdp <= givingAvgAdp * 1.1;

    if (shouldAccept) {
      await updateParticipantDecision(tradeId, botMemberId, "accepted");

      // Check if all recipients have now accepted
      const updatedParticipants = await getTradeParticipants(tradeId);
      const recipients = updatedParticipants.filter((p) => p.role === "recipient");
      const allAccepted = recipients.every((p) => p.decision === "accepted");

      if (allAccepted) {
        await executeBotTrade(tradeId);
      }

      // Notify proposer
      const proposer = participants.find((p) => p.role === "proposer");
      if (proposer?.userId) {
        await createNotification({
          userId: proposer.userId,
          tradeId,
          type: "trade_accepted",
        });
      }

      return { success: true, decision: "accepted", executed: allAccepted };
    } else {
      await updateParticipantDecision(tradeId, botMemberId, "declined");
      await updateTradeStatus(tradeId, "declined");

      // Notify proposer
      const proposer = participants.find((p) => p.role === "proposer");
      if (proposer?.userId) {
        await createNotification({
          userId: proposer.userId,
          tradeId,
          type: "trade_declined",
        });
      }

      return { success: true, decision: "declined" };
    }
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to process bot trade response" };
  }
}

/**
 * Execute a trade (internal helper, similar to trades.ts executeTrade)
 */
async function executeBotTrade(tradeId: string) {
  const trade = await getTradeById(tradeId);
  if (!trade) return;

  const items = await getTradeItems(tradeId);

  for (const item of items) {
    const rosterEntry = await getRosterPlayerByPlayerAndMember(item.fromMemberId, item.playerId);
    if (!rosterEntry) continue;

    await removeRosterPlayer(rosterEntry.id);

    const openSlot = await getFirstOpenBenchSlot(item.toMemberId);
    if (!openSlot) continue;

    await addPlayerToRoster(item.toMemberId, item.playerId, openSlot, "trade");
  }

  await updateTradeStatus(tradeId, "completed");

  const participants = await getTradeParticipants(tradeId);
  for (const p of participants) {
    if (!p.userId) continue;
    await createNotification({
      userId: p.userId,
      tradeId,
      type: "trade_completed",
    });
    await markNotificationsRead(tradeId, p.userId);
  }

  // Create activity feed event
  const teamNames = participants.map((p) => p.teamName || p.userName || "Unknown").join(", ");
  const playerNames = items.map((item) => item.playerName).join(", ");
  await createLeagueActivityEvent({
    leagueId: trade.leagueId,
    type: "trade_completed",
    payload: JSON.stringify({
      tradeId,
      teams: teamNames,
      players: playerNames,
      participantCount: participants.length,
      playerCount: items.length,
    }),
  });

  // System chat message
  const tradeDetails = items.map((item) => {
    const fromTeam = participants.find((p) => p.memberId === item.fromMemberId);
    const toTeam = participants.find((p) => p.memberId === item.toMemberId);
    return `${item.playerName} (${fromTeam?.teamName || "Unknown"} → ${toTeam?.teamName || "Unknown"})`;
  });
  await insertSystemChatMessage(trade.leagueId, `Trade completed: ${tradeDetails.join(", ")}`, {
    type: "trade_completed",
    tradeId,
  });
}

/**
 * Process trade responses for all bot recipients in a trade.
 * Called immediately after a trade is created.
 */
export async function processBotTradeResponsesAction(tradeId: string) {
  try {
    const trade = await getTradeById(tradeId);
    if (!trade || trade.status !== "proposed") {
      return { error: "Trade not found or not pending" };
    }

    const participants = await getTradeParticipants(tradeId);
    const botRecipients = [];

    for (const p of participants) {
      if (p.role === "recipient" && p.decision === "pending") {
        const member = await getMemberById(p.memberId);
        if (member?.isBot) {
          botRecipients.push(p.memberId);
        }
      }
    }

    const results: { memberId: string; decision: string }[] = [];

    for (const botMemberId of botRecipients) {
      const result = await botRespondToTradeAction(tradeId, botMemberId);
      if (result.decision) {
        results.push({ memberId: botMemberId, decision: result.decision });
      }
      // If trade was declined by one bot, stop processing
      if (result.decision === "declined") {
        break;
      }
    }

    return { success: true, results };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to process bot trade responses" };
  }
}
