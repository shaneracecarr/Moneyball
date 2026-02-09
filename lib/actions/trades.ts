"use server";

import { auth } from "@/lib/supabase/server";
import {
  getLeagueMembers,
  getMemberRoster,
  createTrade,
  createTradeParticipant,
  createTradeItems,
  getTradeById,
  getTradeParticipants,
  getTradeItems,
  updateTradeStatus,
  updateParticipantDecision,
  getLeagueTrades,
  getUserPendingTradesAsRecipient,
  createNotification,
  markNotificationsRead,
  removeRosterPlayer,
  addPlayerToRoster,
  getFirstOpenBenchSlot,
  getRosterPlayerByPlayerAndMember,
  createLeagueActivityEvent,
  insertSystemChatMessage,
} from "@/lib/db/queries";
import { processBotTradeResponsesAction } from "./bot";

async function getMemberForUser(userId: string, leagueId: string) {
  const members = await getLeagueMembers(leagueId);
  return members.find((m) => m.userId === userId) || null;
}

export async function createTradeAction(
  leagueId: string,
  recipientMemberIds: string[],
  items: { playerId: string; fromMemberId: string; toMemberId: string }[]
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };

    if (recipientMemberIds.length === 0) return { error: "At least one recipient team is required" };
    if (items.length === 0) return { error: "At least one trade item is required" };

    // All participant member IDs (proposer + recipients)
    const allParticipantIds = [currentMember.id, ...recipientMemberIds];
    const participantSet = new Set(allParticipantIds);

    // Validate no duplicates in recipients
    if (new Set(recipientMemberIds).size !== recipientMemberIds.length) {
      return { error: "Duplicate recipient teams" };
    }

    // Validate proposer is not a recipient
    if (recipientMemberIds.includes(currentMember.id)) {
      return { error: "You cannot trade with yourself" };
    }

    // Validate all recipient member IDs belong to this league
    const memberIds = new Set(members.map((m) => m.id));
    for (const rid of recipientMemberIds) {
      if (!memberIds.has(rid)) return { error: "Invalid recipient team" };
    }

    // Validate items
    const playerIds = new Set<string>();
    for (const item of items) {
      if (playerIds.has(item.playerId)) {
        return { error: "A player cannot appear more than once in a trade" };
      }
      playerIds.add(item.playerId);

      if (item.fromMemberId === item.toMemberId) {
        return { error: "From and To team must be different for each item" };
      }
      if (!participantSet.has(item.fromMemberId) || !participantSet.has(item.toMemberId)) {
        return { error: "From/To teams must be participants in the trade" };
      }
    }

    // Validate ownership: each fromMemberId must own the player
    for (const item of items) {
      const roster = await getMemberRoster(item.fromMemberId);
      const ownsPlayer = roster.some((r) => r.playerId === item.playerId);
      if (!ownsPlayer) {
        return { error: `Team does not own the player being traded` };
      }
    }

    // Validate receiving teams have roster space
    // Count how many players each team is receiving vs sending
    const netReceiving = new Map<string, number>();
    for (const item of items) {
      netReceiving.set(item.toMemberId, (netReceiving.get(item.toMemberId) || 0) + 1);
      netReceiving.set(item.fromMemberId, (netReceiving.get(item.fromMemberId) || 0) - 1);
    }
    for (const [memberId, net] of Array.from(netReceiving.entries())) {
      if (net > 0) {
        // This team is receiving more than sending — check bench slots
        const roster = await getMemberRoster(memberId);
        const benchSlots = ["BN1", "BN2", "BN3", "BN4", "BN5", "BN6", "BN7"] as const;
        const occupiedSlots = new Set<string>(roster.map((r) => r.slot));
        let openBench = 0;
        for (const s of benchSlots) {
          if (!occupiedSlots.has(s)) openBench++;
        }
        if (openBench < net) {
          return { error: "A team does not have enough open bench slots for this trade" };
        }
      }
    }

    // Create the trade
    const trade = await createTrade({
      leagueId,
      proposerMemberId: currentMember.id,
    });

    // Create participants
    await createTradeParticipant({
      tradeId: trade.id,
      memberId: currentMember.id,
      role: "proposer",
      decision: "accepted",
      decidedAt: new Date(),
    });

    for (const rid of recipientMemberIds) {
      await createTradeParticipant({
        tradeId: trade.id,
        memberId: rid,
        role: "recipient",
        decision: "pending",
      });

      // Create notification for recipient user
      const recipientMember = members.find((m) => m.id === rid);
      if (recipientMember && recipientMember.userId) {
        await createNotification({
          userId: recipientMember.userId,
          tradeId: trade.id,
          type: "trade_proposed",
        });
      }
    }

    // Create trade items
    await createTradeItems(
      items.map((item) => ({
        tradeId: trade.id,
        playerId: item.playerId,
        fromMemberId: item.fromMemberId,
        toMemberId: item.toMemberId,
      }))
    );

    // Process any bot recipients immediately
    await processBotTradeResponsesAction(trade.id);

    return { success: true, tradeId: trade.id };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to create trade" };
  }
}

export async function acceptTradeAction(tradeId: string, leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const currentMember = await getMemberForUser(session.user.id, leagueId);
    if (!currentMember) return { error: "You are not a member of this league" };

    const trade = await getTradeById(tradeId);
    if (!trade) return { error: "Trade not found" };
    if (trade.status !== "proposed") return { error: "Trade is no longer pending" };
    if (trade.leagueId !== leagueId) return { error: "Trade does not belong to this league" };

    const participants = await getTradeParticipants(tradeId);
    const myParticipant = participants.find(
      (p) => p.memberId === currentMember.id && p.role === "recipient"
    );
    if (!myParticipant) return { error: "You are not a recipient in this trade" };
    if (myParticipant.decision !== "pending") return { error: "You have already responded to this trade" };

    await updateParticipantDecision(tradeId, currentMember.id, "accepted");

    // Check if all recipients have accepted
    const updatedParticipants = await getTradeParticipants(tradeId);
    const recipients = updatedParticipants.filter((p) => p.role === "recipient");
    const allAccepted = recipients.every((p) => p.decision === "accepted");

    if (allAccepted) {
      await executeTrade(tradeId);
    }

    // Notify proposer
    await createNotification({
      userId: trade.proposerMemberId ? updatedParticipants.find(p => p.role === "proposer")?.userId || "" : "",
      tradeId,
      type: "trade_accepted",
    });

    return { success: true, executed: allAccepted };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to accept trade" };
  }
}

export async function declineTradeAction(tradeId: string, leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const currentMember = await getMemberForUser(session.user.id, leagueId);
    if (!currentMember) return { error: "You are not a member of this league" };

    const trade = await getTradeById(tradeId);
    if (!trade) return { error: "Trade not found" };
    if (trade.status !== "proposed") return { error: "Trade is no longer pending" };
    if (trade.leagueId !== leagueId) return { error: "Trade does not belong to this league" };

    const participants = await getTradeParticipants(tradeId);
    const myParticipant = participants.find(
      (p) => p.memberId === currentMember.id && p.role === "recipient"
    );
    if (!myParticipant) return { error: "You are not a recipient in this trade" };
    if (myParticipant.decision !== "pending") return { error: "You have already responded to this trade" };

    await updateParticipantDecision(tradeId, currentMember.id, "declined");
    await updateTradeStatus(tradeId, "declined");

    // Notify proposer
    const proposer = participants.find(p => p.role === "proposer");
    if (proposer && proposer.userId) {
      await createNotification({
        userId: proposer.userId,
        tradeId,
        type: "trade_declined",
      });
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to decline trade" };
  }
}

export async function cancelTradeAction(tradeId: string, leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const currentMember = await getMemberForUser(session.user.id, leagueId);
    if (!currentMember) return { error: "You are not a member of this league" };

    const trade = await getTradeById(tradeId);
    if (!trade) return { error: "Trade not found" };
    if (trade.status !== "proposed") return { error: "Trade is no longer pending" };
    if (trade.proposerMemberId !== currentMember.id) return { error: "Only the proposer can cancel" };

    await updateTradeStatus(tradeId, "canceled");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to cancel trade" };
  }
}

async function executeTrade(tradeId: string) {
  const trade = await getTradeById(tradeId);
  if (!trade) return;

  const items = await getTradeItems(tradeId);

  for (const item of items) {
    // Find the roster entry for this player on the source team
    const rosterEntry = await getRosterPlayerByPlayerAndMember(item.fromMemberId, item.playerId);
    if (!rosterEntry) continue; // Should not happen if validation passed

    // Remove from source team
    await removeRosterPlayer(rosterEntry.id);

    // Find first open bench slot on destination team
    const openSlot = await getFirstOpenBenchSlot(item.toMemberId);
    if (!openSlot) continue; // Should not happen if validation passed

    // Add to destination team
    await addPlayerToRoster(item.toMemberId, item.playerId, openSlot, "trade");
  }

  await updateTradeStatus(tradeId, "completed");

  // Notify all participants about completion
  const participants = await getTradeParticipants(tradeId);
  for (const p of participants) {
    if (!p.userId) continue;
    await createNotification({
      userId: p.userId,
      tradeId,
      type: "trade_completed",
    });
  }

  // Mark proposal notifications as read
  for (const p of participants) {
    if (!p.userId) continue;
    await markNotificationsRead(tradeId, p.userId);
  }

  // Create activity feed event
  const teamNames = participants.map((p) => p.teamName || p.userName || p.userEmail).join(", ");
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

  // Create system chat message for trade completion
  const tradeDetails = items.map((item) => {
    const fromTeam = participants.find((p) => p.memberId === item.fromMemberId);
    const toTeam = participants.find((p) => p.memberId === item.toMemberId);
    return `${item.playerName} (${fromTeam?.teamName || "Unknown"} → ${toTeam?.teamName || "Unknown"})`;
  });
  const chatText = `Trade completed: ${tradeDetails.join(", ")}`;
  await insertSystemChatMessage(trade.leagueId, chatText, {
    type: "trade_completed",
    tradeId,
    items: items.map((item) => ({
      playerId: item.playerId,
      playerName: item.playerName,
      fromMemberId: item.fromMemberId,
      toMemberId: item.toMemberId,
    })),
  });
}

export async function getTradesPageDataAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };

    const leagueTrades = await getLeagueTrades(leagueId);

    // Enrich each trade with participants and items
    const enrichedTrades = await Promise.all(
      leagueTrades.map(async (trade) => {
        const participants = await getTradeParticipants(trade.id);
        const items = await getTradeItems(trade.id);
        return { ...trade, participants, items };
      })
    );

    // Get all member rosters for the trade form
    const memberRosters = await Promise.all(
      members.map(async (m) => {
        const roster = await getMemberRoster(m.id);
        return {
          memberId: m.id,
          teamName: m.teamName,
          userName: m.userName || m.userEmail,
          userId: m.userId,
          roster,
        };
      })
    );

    return {
      trades: enrichedTrades,
      members,
      memberRosters,
      currentMemberId: currentMember.id,
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to load trades" };
  }
}

export async function getInboxDataAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const currentMember = await getMemberForUser(session.user.id, leagueId);
    if (!currentMember) return { error: "You are not a member of this league" };

    // Get trades where user is a pending recipient
    const pendingParticipations = await getUserPendingTradesAsRecipient(currentMember.id);

    const inboxTrades = await Promise.all(
      pendingParticipations.map(async (p) => {
        const trade = await getTradeById(p.tradeId);
        if (!trade || trade.status !== "proposed") return null;
        const participants = await getTradeParticipants(p.tradeId);
        const items = await getTradeItems(p.tradeId);
        return { ...trade, participants, items };
      })
    );

    return {
      trades: inboxTrades.filter(Boolean),
      currentMemberId: currentMember.id,
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to load inbox" };
  }
}
