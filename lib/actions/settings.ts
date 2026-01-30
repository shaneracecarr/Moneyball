"use server";

import { auth } from "@/auth";
import { leagueSettingsSchema } from "@/lib/validations/settings";
import {
  getLeagueSettings,
  upsertLeagueSettings,
  getLeagueMembers,
  isUserInLeague,
  getDraftByLeagueId,
} from "@/lib/db/queries";
import type { LeagueSettings } from "@/lib/league-settings";

export async function getLeagueSettingsAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in" };
    }

    const isMember = await isUserInLeague(session.user.id, leagueId);
    if (!isMember) {
      return { error: "You are not a member of this league" };
    }

    const settings = await getLeagueSettings(leagueId);

    // Check if draft has started to determine if settings are locked
    const draft = await getDraftByLeagueId(leagueId);
    const locked = draft
      ? draft.status === "in_progress" || draft.status === "completed"
      : false;

    return { settings, locked };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to get league settings" };
  }
}

export async function updateLeagueSettingsAction(
  leagueId: string,
  data: Partial<LeagueSettings>
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in" };
    }

    // Check commissioner status
    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) {
      return { error: "You are not a member of this league" };
    }
    if (!currentMember.isCommissioner) {
      return { error: "Only the commissioner can update league settings" };
    }

    // Check if draft has started
    const draft = await getDraftByLeagueId(leagueId);
    if (draft && (draft.status === "in_progress" || draft.status === "completed")) {
      return { error: "Settings cannot be changed after the draft has started" };
    }

    // Validate the settings
    const validated = leagueSettingsSchema.parse(data);

    await upsertLeagueSettings(leagueId, validated);

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to update league settings" };
  }
}
