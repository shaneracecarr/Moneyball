"use server";

import { auth } from "@/lib/supabase/server";
import {
  getLeagueMembers,
  getLeagueSettings,
  upsertLeagueSettings,
  getDraftByLeagueId,
} from "@/lib/db/queries";
import { leagueSettingsSchema } from "@/lib/validations/league-settings";
import { generateSlotConfig } from "@/lib/roster-config";
import type { LeagueSettings } from "@/lib/league-settings";

export async function getLeagueSettingsAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember) return { error: "You are not a member of this league" };

    const settings = await getLeagueSettings(leagueId);
    const slotConfig = generateSlotConfig(settings);

    // Check draft status for UI lock
    const draft = await getDraftByLeagueId(leagueId);
    const draftStartedOrCompleted = draft
      ? draft.status === "in_progress" || draft.status === "completed"
      : false;

    return {
      settings,
      slotConfig,
      isCommissioner: currentMember.isCommissioner,
      draftStartedOrCompleted,
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to load league settings" };
  }
}

export async function updateLeagueSettingsAction(
  leagueId: string,
  rawSettings: LeagueSettings
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "You must be logged in" };

    const members = await getLeagueMembers(leagueId);
    const currentMember = members.find((m) => m.userId === session.user.id);
    if (!currentMember?.isCommissioner) {
      return { error: "Only the commissioner can update league settings" };
    }

    const validated = leagueSettingsSchema.parse(rawSettings);

    // Guard: cannot change roster slots after draft started/completed
    const draft = await getDraftByLeagueId(leagueId);
    if (draft && (draft.status === "in_progress" || draft.status === "completed")) {
      const current = await getLeagueSettings(leagueId);
      const rosterKeys = [
        "qbCount", "rbCount", "wrCount", "teCount", "flexCount",
        "kCount", "defCount", "benchCount", "irCount",
      ] as const;
      const changed = rosterKeys.some(
        (k) => validated[k] !== current[k]
      );
      if (changed) {
        return { error: "Cannot change roster settings after the draft has started or completed" };
      }
    }

    await upsertLeagueSettings(leagueId, validated);

    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: "Failed to update league settings" };
  }
}
