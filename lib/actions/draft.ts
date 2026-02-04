"use server";

import { auth } from "@/auth";
import { setupDraftSchema, makePickSchema } from "@/lib/validations/draft";
import {
  getLeagueById,
  getLeagueMembers,
  isUserInLeague,
  getLeagueMemberCount,
  createDraft,
  getDraftByLeagueId,
  updateDraftStatus,
  setDraftOrder,
  getDraftOrder,
  createDraftPick,
  getDraftPicks,
  isPlayerDrafted,
  advanceDraftPick,
  searchAvailablePlayers,
  populateRosterFromDraft,
  updateLeaguePhase,
  getMemberById,
  getBestAvailablePlayerByAdp,
} from "@/lib/db/queries";
import { getSnakeDraftPosition, getMemberIdForPick } from "@/lib/draft-utils";

export async function setupDraftAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in" };
    }

    const rawData = {
      leagueId: formData.get("leagueId") as string,
      numberOfRounds: Number(formData.get("numberOfRounds") || 15),
    };

    const validated = setupDraftSchema.parse(rawData);

    const league = await getLeagueById(validated.leagueId);
    if (!league) return { error: "League not found" };

    // Must be commissioner
    const members = await getLeagueMembers(validated.leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember?.isCommissioner) {
      return { error: "Only the commissioner can set up the draft" };
    }

    // League must be full
    if (members.length < league.numberOfTeams) {
      return { error: `League must be full (${members.length}/${league.numberOfTeams} members)` };
    }

    // Check if draft already exists
    const existingDraft = await getDraftByLeagueId(validated.leagueId);
    if (existingDraft) {
      return { error: "Draft already exists for this league" };
    }

    // Create draft
    const draft = await createDraft(validated.leagueId, validated.numberOfRounds);

    // Randomize order
    const shuffled = [...members].sort(() => Math.random() - 0.5);
    await setDraftOrder(draft.id, shuffled.map((m) => m.id));

    return { success: true, draftId: draft.id };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to set up draft" };
  }
}

export async function randomizeDraftOrderAction(draftId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const order = await getDraftOrder(draftId);
    if (order.length === 0) return { error: "Draft not found" };

    // Verify commissioner
    const draftData = await getDraftByLeagueId(order[0].draftId);
    // We need to find the draft's league to check commissioner
    // The draftId is the same, so let's use the order's data
    const members = await getLeagueMembers(
      // Get league ID from the draft
      (await getDraftByLeagueId_internal(draftId))?.leagueId || ""
    );
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember?.isCommissioner) {
      return { error: "Only the commissioner can randomize draft order" };
    }

    // Draft must be scheduled
    const draft = await getDraftByLeagueId_internal(draftId);
    if (!draft || draft.status !== "scheduled") {
      return { error: "Can only randomize order for a scheduled draft" };
    }

    const shuffled = [...order].sort(() => Math.random() - 0.5);
    await setDraftOrder(draftId, shuffled.map((o) => o.memberId));

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to randomize draft order" };
  }
}

export async function startDraftAction(draftId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const draft = await getDraftByLeagueId_internal(draftId);
    if (!draft) return { error: "Draft not found" };
    if (draft.status !== "scheduled") return { error: "Draft is not in scheduled status" };

    const members = await getLeagueMembers(draft.leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember?.isCommissioner) {
      return { error: "Only the commissioner can start the draft" };
    }

    const league = await getLeagueById(draft.leagueId);
    if (!league) return { error: "League not found" };
    if (members.length < league.numberOfTeams) {
      return { error: "League must be full to start draft" };
    }

    await updateDraftStatus(draftId, "in_progress", { startedAt: new Date() });
    await updateLeaguePhase(draft.leagueId, "drafting");

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to start draft" };
  }
}

export async function makePickAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const rawData = {
      draftId: formData.get("draftId") as string,
      playerId: formData.get("playerId") as string,
    };

    const validated = makePickSchema.parse(rawData);

    const draft = await getDraftByLeagueId_internal(validated.draftId);
    if (!draft) return { error: "Draft not found" };
    if (draft.status !== "in_progress") return { error: "Draft is not in progress" };

    const league = await getLeagueById(draft.leagueId);
    if (!league) return { error: "League not found" };

    const members = await getLeagueMembers(draft.leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };

    // Check if it's this user's turn
    const order = await getDraftOrder(draft.id);
    const expectedMemberId = getMemberIdForPick(
      draft.currentPick,
      league.numberOfTeams,
      order
    );

    if (expectedMemberId !== currentMember.id) {
      return { error: "It is not your turn to pick" };
    }

    // Check player not already drafted
    const alreadyDrafted = await isPlayerDrafted(draft.id, validated.playerId);
    if (alreadyDrafted) return { error: "Player has already been drafted" };

    // Make the pick
    const { round } = getSnakeDraftPosition(draft.currentPick, league.numberOfTeams);
    await createDraftPick(
      draft.id,
      validated.playerId,
      currentMember.id,
      draft.currentPick,
      round
    );

    // Check if draft is complete
    const totalPicks = draft.numberOfRounds * league.numberOfTeams;
    if (draft.currentPick >= totalPicks) {
      await updateDraftStatus(draft.id, "completed", { completedAt: new Date() });
      await populateRosterFromDraft(draft.id);
      await updateLeaguePhase(league.id, "setup");
    } else {
      await advanceDraftPick(draft.id, draft.currentPick + 1);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to make pick" };
  }
}

export async function getDraftStateAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const isMember = await isUserInLeague(session.user.id, leagueId);
    if (!isMember) return { error: "You are not a member of this league" };

    const draft = await getDraftByLeagueId(leagueId);
    if (!draft) return { draft: null };

    const league = await getLeagueById(leagueId);
    if (!league) return { error: "League not found" };

    const order = await getDraftOrder(draft.id);
    const picks = await getDraftPicks(draft.id);

    // Determine who is on the clock
    let onTheClockMemberId: string | undefined;
    if (draft.status === "in_progress") {
      onTheClockMemberId = getMemberIdForPick(
        draft.currentPick,
        league.numberOfTeams,
        order
      );
    }

    // Find current user's member ID
    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);

    return {
      draft,
      order,
      picks,
      onTheClockMemberId,
      currentUserMemberId: currentMember?.id,
      isCommissioner: currentMember?.isCommissioner ?? false,
      numberOfTeams: league.numberOfTeams,
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to get draft state" };
  }
}

export async function searchAvailablePlayersAction(
  draftId: string,
  options: { search?: string; position?: string; limit?: number }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in", players: [] };

    const players = await searchAvailablePlayers(draftId, options);
    return { players };
  } catch (error) {
    return { error: "Failed to search players", players: [] };
  }
}

export async function autoPickAction(draftId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const draft = await getDraftByLeagueId_internal(draftId);
    if (!draft) return { error: "Draft not found" };
    if (draft.status !== "in_progress") return { error: "Draft is not in progress" };

    const league = await getLeagueById(draft.leagueId);
    if (!league) return { error: "League not found" };

    // Verify caller is in the league
    const isMember = await isUserInLeague(session.user.id, draft.leagueId);
    if (!isMember) return { error: "You are not a member of this league" };

    // Find who is on the clock
    const order = await getDraftOrder(draft.id);
    const onTheClockMemberId = getMemberIdForPick(
      draft.currentPick,
      league.numberOfTeams,
      order
    );
    if (!onTheClockMemberId) return { error: "Could not determine on-the-clock member" };

    // Get available players and pick a random one
    const available = await searchAvailablePlayers(draft.id, { limit: 50 });
    if (available.length === 0) return { error: "No available players" };

    const randomIndex = Math.floor(Math.random() * available.length);
    const randomPlayer = available[randomIndex];

    // Make the pick for the on-the-clock member
    const { round } = getSnakeDraftPosition(draft.currentPick, league.numberOfTeams);
    await createDraftPick(
      draft.id,
      randomPlayer.id,
      onTheClockMemberId,
      draft.currentPick,
      round
    );

    // Check if draft is complete
    const totalPicks = draft.numberOfRounds * league.numberOfTeams;
    if (draft.currentPick >= totalPicks) {
      await updateDraftStatus(draft.id, "completed", { completedAt: new Date() });
      await populateRosterFromDraft(draft.id);
      await updateLeaguePhase(league.id, "setup");
      return { success: true, draftComplete: true };
    } else {
      await advanceDraftPick(draft.id, draft.currentPick + 1);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to auto-pick" };
  }
}

// Internal helper to get draft by its own ID (not league ID)
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { drafts as draftsTable } from "@/lib/db/schema";

async function getDraftByLeagueId_internal(draftId: string) {
  const result = await db
    .select()
    .from(draftsTable)
    .where(eq(draftsTable.id, draftId))
    .limit(1);
  return result[0];
}

// Bot draft functions

/**
 * Check if the current pick belongs to a bot and make the pick if so.
 * Returns info about what happened.
 */
export async function processBotPicksAction(draftId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    let picksProcessed = 0;
    let lastPickedPlayer: { name: string; position: string } | null = null;
    let draftComplete = false;

    // Process bot picks in a loop until it's a human's turn or draft is done
    while (true) {
      const draft = await getDraftByLeagueId_internal(draftId);
      if (!draft) return { error: "Draft not found" };
      if (draft.status !== "in_progress") {
        draftComplete = draft.status === "completed";
        break;
      }

      const league = await getLeagueById(draft.leagueId);
      if (!league) return { error: "League not found" };

      // Verify caller is in the league
      const isMember = await isUserInLeague(session.user.id, draft.leagueId);
      if (!isMember) return { error: "You are not a member of this league" };

      // Find who is on the clock
      const order = await getDraftOrder(draft.id);
      const onTheClockMemberId = getMemberIdForPick(
        draft.currentPick,
        league.numberOfTeams,
        order
      );
      if (!onTheClockMemberId) return { error: "Could not determine on-the-clock member" };

      // Check if current picker is a bot
      const member = await getMemberById(onTheClockMemberId);
      if (!member || !member.isBot) {
        // Not a bot's turn, stop processing
        break;
      }

      // Bot's turn - pick best available by ADP
      const bestPlayer = await getBestAvailablePlayerByAdp(draft.id);
      if (!bestPlayer) {
        return { error: "No available players for bot to draft" };
      }

      // Make the pick
      const { round } = getSnakeDraftPosition(draft.currentPick, league.numberOfTeams);
      await createDraftPick(
        draft.id,
        bestPlayer.id,
        onTheClockMemberId,
        draft.currentPick,
        round
      );

      picksProcessed++;
      lastPickedPlayer = { name: bestPlayer.fullName, position: bestPlayer.position };

      // Check if draft is complete
      const totalPicks = draft.numberOfRounds * league.numberOfTeams;
      if (draft.currentPick >= totalPicks) {
        await updateDraftStatus(draft.id, "completed", { completedAt: new Date() });
        await populateRosterFromDraft(draft.id);
        await updateLeaguePhase(league.id, "setup");
        draftComplete = true;
        break;
      } else {
        await advanceDraftPick(draft.id, draft.currentPick + 1);
      }
    }

    return {
      success: true,
      picksProcessed,
      lastPickedPlayer,
      draftComplete,
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to process bot picks" };
  }
}

/**
 * Check if the current pick is a bot's turn
 */
export async function isCurrentPickBotAction(draftId: string) {
  try {
    const draft = await getDraftByLeagueId_internal(draftId);
    if (!draft || draft.status !== "in_progress") {
      return { isBot: false };
    }

    const league = await getLeagueById(draft.leagueId);
    if (!league) return { isBot: false };

    const order = await getDraftOrder(draft.id);
    const onTheClockMemberId = getMemberIdForPick(
      draft.currentPick,
      league.numberOfTeams,
      order
    );
    if (!onTheClockMemberId) return { isBot: false };

    const member = await getMemberById(onTheClockMemberId);
    return { isBot: member?.isBot ?? false };
  } catch {
    return { isBot: false };
  }
}
