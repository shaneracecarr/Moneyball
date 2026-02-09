"use server";

import { auth } from "@/lib/supabase/server";
import {
  getLeagueMembers,
  getChatMessages,
  createChatMessage,
} from "@/lib/db/queries";

const MAX_MESSAGE_LENGTH = 500;
const MIN_MESSAGE_LENGTH = 1;

// Simple in-memory rate limiting (resets on server restart)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 1000; // 1 second between messages

async function getMemberForUser(userId: string, leagueId: string) {
  const members = await getLeagueMembers(leagueId);
  return members.find((m) => m.userId === userId) || null;
}

export async function getChatMessagesAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in", messages: [] };
    }

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) {
      return { error: "You are not a member of this league", messages: [] };
    }

    const messages = await getChatMessages(leagueId, 50);
    return { messages };
  } catch (error) {
    return { error: "Failed to load messages", messages: [] };
  }
}

export async function postChatMessageAction(leagueId: string, text: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in" };
    }

    const member = await getMemberForUser(session.user.id, leagueId);
    if (!member) {
      return { error: "You are not a member of this league" };
    }

    // Validate message text
    const trimmedText = text.trim();
    if (trimmedText.length < MIN_MESSAGE_LENGTH) {
      return { error: "Message cannot be empty" };
    }
    if (trimmedText.length > MAX_MESSAGE_LENGTH) {
      return { error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters` };
    }

    // Rate limiting
    const rateLimitKey = `${session.user.id}:${leagueId}`;
    const lastMessageTime = rateLimitMap.get(rateLimitKey) || 0;
    const now = Date.now();
    if (now - lastMessageTime < RATE_LIMIT_MS) {
      return { error: "Please wait before sending another message" };
    }
    rateLimitMap.set(rateLimitKey, now);

    await createChatMessage({
      leagueId,
      type: "user",
      userId: session.user.id,
      memberId: member.id,
      text: trimmedText,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to send message" };
  }
}
