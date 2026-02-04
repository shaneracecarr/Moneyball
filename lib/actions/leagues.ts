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
import { DEFAULT_LEAGUE_SETTINGS, MOCK_LEAGUE_SETTINGS, WaiverType } from "@/lib/league-settings";
import { leagueSettingsSchema } from "@/lib/validations/settings";

// Interface for bot team configuration
interface BotTeam {
  name: string;
}

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

    // Parse bot teams from form data
    const botTeamsJson = formData.get("botTeams") as string;
    let botTeams: BotTeam[] = [];
    if (botTeamsJson) {
      try {
        botTeams = JSON.parse(botTeamsJson);
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Validate bot count doesn't exceed team limit (must leave at least 1 slot for creator)
    if (botTeams.length >= validatedData.numberOfTeams) {
      return { error: `Cannot have ${botTeams.length} bots with only ${validatedData.numberOfTeams} teams (need at least 1 human)` };
    }

    // Check if this is a mock league
    const isMock = formData.get("isMock") === "true";

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
      session.user.id,
      isMock
    );

    // Add creator as commissioner
    await createLeagueMember(league.id, session.user.id, null, true, false);

    // Add bot teams
    for (const bot of botTeams) {
      await createLeagueMember(
        league.id,
        null, // No user ID for bots
        bot.name || "Bot",
        false, // Not commissioner
        true // Is bot
      );
    }

    // Determine waiver settings based on league type
    // Mock leagues: no waivers (free agency only)
    // Regular leagues: user can choose standard or FAAB
    let waiverType: WaiverType = "standard";
    let faabBudget: number | null = null;

    if (isMock) {
      // Mock leagues have no waivers
      waiverType = "none";
      faabBudget = null;
    } else {
      // Regular leagues: get waiver settings from form
      const formWaiverType = formData.get("waiverType") as string;
      if (formWaiverType === "faab") {
        waiverType = "faab";
        faabBudget = Number(formData.get("faabBudget")) || 100;
      } else {
        waiverType = "standard";
        faabBudget = null;
      }
    }

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
      waiverType,
      faabBudget,
    };

    try {
      const validatedSettings = leagueSettingsSchema.parse(settingsData);
      await upsertLeagueSettings(league.id, validatedSettings);
    } catch {
      // If settings validation fails, save defaults based on league type
      await upsertLeagueSettings(league.id, isMock ? MOCK_LEAGUE_SETTINGS : DEFAULT_LEAGUE_SETTINGS);
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
