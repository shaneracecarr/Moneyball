"use server";

import { auth } from "@/lib/supabase/server";
import {
  getLeagueMembers,
  addToTradeBlock,
  removeFromTradeBlock,
  getMemberTradeBlock,
  getLeagueTradeBlock,
  isPlayerOnTradeBlock,
  addToWatchlist,
  removeFromWatchlist,
  getMemberWatchlist,
  isPlayerOnWatchlist,
  getWatchlistPlayerIds,
  getTradeBlockPlayerIds,
} from "@/lib/db/queries";

async function getMemberForUser(userId: string, leagueId: string) {
  const members = await getLeagueMembers(leagueId);
  return members.find((m) => m.userId === userId) || null;
}

// ============================================================================
// TRADE BLOCK ACTIONS
// ============================================================================

export async function addToTradeBlockAction(leagueId: string, playerId: string, note?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { error: "You are not a member of this league" };

    await addToTradeBlock(member.id, playerId, note);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to add to trade block" };
  }
}

export async function removeFromTradeBlockAction(leagueId: string, playerId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { error: "You are not a member of this league" };

    await removeFromTradeBlock(member.id, playerId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to remove from trade block" };
  }
}

export async function getMyTradeBlockAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in", players: [] };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { error: "You are not a member of this league", players: [] };

    const players = await getMemberTradeBlock(member.id);
    return { players };
  } catch (error) {
    return { error: "Failed to get trade block", players: [] };
  }
}

export async function getLeagueTradeBlockAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in", players: [] };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { error: "You are not a member of this league", players: [] };

    const players = await getLeagueTradeBlock(leagueId);
    return { players };
  } catch (error) {
    return { error: "Failed to get league trade block", players: [] };
  }
}

export async function isOnTradeBlockAction(leagueId: string, playerId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { isOnBlock: false };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { isOnBlock: false };

    const isOnBlock = await isPlayerOnTradeBlock(member.id, playerId);
    return { isOnBlock };
  } catch (error) {
    return { isOnBlock: false };
  }
}

// ============================================================================
// WATCHLIST ACTIONS
// ============================================================================

export async function addToWatchlistAction(leagueId: string, playerId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { error: "You are not a member of this league" };

    await addToWatchlist(member.id, playerId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to add to watchlist" };
  }
}

export async function removeFromWatchlistAction(leagueId: string, playerId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { error: "You are not a member of this league" };

    await removeFromWatchlist(member.id, playerId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to remove from watchlist" };
  }
}

export async function getMyWatchlistAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in", players: [] };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { error: "You are not a member of this league", players: [] };

    const players = await getMemberWatchlist(member.id);
    return { players };
  } catch (error) {
    return { error: "Failed to get watchlist", players: [] };
  }
}

export async function isOnWatchlistAction(leagueId: string, playerId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { isOnWatchlist: false };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { isOnWatchlist: false };

    const isOnList = await isPlayerOnWatchlist(member.id, playerId);
    return { isOnWatchlist: isOnList };
  } catch (error) {
    return { isOnWatchlist: false };
  }
}

// Get both trade block and watchlist status for a player in one call
export async function getPlayerTradeStatusAction(leagueId: string, playerId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { isOnTradeBlock: false, isOnWatchlist: false };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { isOnTradeBlock: false, isOnWatchlist: false };

    const [isOnBlock, isOnWatch] = await Promise.all([
      isPlayerOnTradeBlock(member.id, playerId),
      isPlayerOnWatchlist(member.id, playerId),
    ]);

    return { isOnTradeBlock: isOnBlock, isOnWatchlist: isOnWatch, memberId: member.id };
  } catch (error) {
    return { isOnTradeBlock: false, isOnWatchlist: false };
  }
}

// Get all trade block and watchlist player IDs for quick lookup
export async function getMyTradeAndWatchlistIdsAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { tradeBlockIds: [], watchlistIds: [] };

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) return { tradeBlockIds: [], watchlistIds: [] };

    const [tradeBlockIds, watchlistIds] = await Promise.all([
      getTradeBlockPlayerIds(member.id),
      getWatchlistPlayerIds(member.id),
    ]);

    return { tradeBlockIds, watchlistIds };
  } catch (error) {
    return { tradeBlockIds: [], watchlistIds: [] };
  }
}
