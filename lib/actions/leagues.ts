"use server";

import { auth } from "@/auth";
import { createLeagueSchema } from "@/lib/validations/auth";
import {
  createLeague,
  createLeagueMember,
  getUserLeagues,
  getLeagueById,
  getLeagueByInviteCode,
  getLeagueMembers,
  isUserInLeague,
  getLeagueMemberCount,
  getLeagueActivityFeed,
  upsertLeagueSettings,
} from "@/lib/db/queries";
import { redirect } from "next/navigation";
import { generateInviteCode } from "@/lib/utils";
import { DEFAULT_LEAGUE_SETTINGS } from "@/lib/league-settings";
import { leagueSettingsSchema } from "@/lib/validations/settings";

export async function createLeagueAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in to create a league" };
    }

    const rawData = {
      name: formData.get("name"),
      numberOfTeams: Number(formData.get("numberOfTeams")),
    };

    const validatedData = createLeagueSchema.parse(rawData);

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    // Ensure code is unique (very unlikely to collide, but let's be safe)
    while (attempts < 10) {
      const existing = await getLeagueByInviteCode(inviteCode);
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    // Create league
    const league = await createLeague(
      validatedData.name,
      validatedData.numberOfTeams,
      inviteCode,
      session.user.id
    );

    // Add creator as commissioner
    await createLeagueMember(league.id, session.user.id, null, true);

    // Save league settings
    const settingsData = {
      qbCount: Number(formData.get("qbCount")) || DEFAULT_LEAGUE_SETTINGS.qbCount,
      rbCount: Number(formData.get("rbCount")) || DEFAULT_LEAGUE_SETTINGS.rbCount,
      wrCount: Number(formData.get("wrCount")) || DEFAULT_LEAGUE_SETTINGS.wrCount,
      teCount: Number(formData.get("teCount")) || DEFAULT_LEAGUE_SETTINGS.teCount,
      flexCount: Number(formData.get("flexCount") ?? DEFAULT_LEAGUE_SETTINGS.flexCount),
      kCount: Number(formData.get("kCount") ?? DEFAULT_LEAGUE_SETTINGS.kCount),
      defCount: Number(formData.get("defCount") ?? DEFAULT_LEAGUE_SETTINGS.defCount),
      benchCount: Number(formData.get("benchCount")) || DEFAULT_LEAGUE_SETTINGS.benchCount,
      irCount: Number(formData.get("irCount") ?? DEFAULT_LEAGUE_SETTINGS.irCount),
      scoringFormat: (formData.get("scoringFormat") as "standard" | "half_ppr" | "ppr") || DEFAULT_LEAGUE_SETTINGS.scoringFormat,
      tradesEnabled: formData.get("tradesEnabled") !== "false",
      tradeDeadlineWeek: formData.get("tradeDeadlineWeek") ? Number(formData.get("tradeDeadlineWeek")) : null,
    };

    try {
      const validatedSettings = leagueSettingsSchema.parse(settingsData);
      await upsertLeagueSettings(league.id, validatedSettings);
    } catch {
      // If settings validation fails, save defaults
      await upsertLeagueSettings(league.id, DEFAULT_LEAGUE_SETTINGS);
    }
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An error occurred while creating the league" };
  }

  redirect("/dashboard");
}

export async function getUserLeaguesAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { leagues: [] };
    }

    const leagues = await getUserLeagues(session.user.id);
    return { leagues };
  } catch (error) {
    return { leagues: [], error: "Failed to fetch leagues" };
  }
}

export async function getLeagueDetailsAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in to view league details" };
    }

    const league = await getLeagueById(leagueId);
    if (!league) {
      return { error: "League not found" };
    }

    // Check if user is a member of this league
    const isMember = await isUserInLeague(session.user.id, leagueId);
    if (!isMember) {
      return { error: "You are not a member of this league" };
    }

    const members = await getLeagueMembers(leagueId);

    return { league, members };
  } catch (error) {
    return { error: "Failed to fetch league details" };
  }
}

export async function joinLeagueByCodeAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in to join a league" };
    }

    const inviteCode = formData.get("inviteCode") as string;
    if (!inviteCode) {
      return { error: "Invite code is required" };
    }

    // Normalize the code (uppercase, trim)
    const normalizedCode = inviteCode.trim().toUpperCase();

    // Find league by invite code
    const league = await getLeagueByInviteCode(normalizedCode);
    if (!league) {
      return { error: "Invalid invite code" };
    }

    // Check if user is already in the league
    const alreadyMember = await isUserInLeague(session.user.id, league.id);
    if (alreadyMember) {
      return { error: "You are already a member of this league" };
    }

    // Check if league is full
    const memberCount = await getLeagueMemberCount(league.id);
    if (memberCount >= league.numberOfTeams) {
      return { error: "This league is full" };
    }

    // Add user to league
    await createLeagueMember(league.id, session.user.id, null, false);

    return { success: true, leagueId: league.id };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An error occurred while joining the league" };
  }
}

export async function getLeagueActivityAction(leagueId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in", activity: [] };
    }

    // Check if user is a member of this league
    const isMember = await isUserInLeague(session.user.id, leagueId);
    if (!isMember) {
      return { error: "You are not a member of this league", activity: [] };
    }

    const activity = await getLeagueActivityFeed(leagueId, 20);
    return { activity };
  } catch (error) {
    return { error: "Failed to fetch activity", activity: [] };
  }
}
