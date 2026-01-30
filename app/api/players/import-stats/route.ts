import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const RAPIDAPI_HOST =
  "tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com";
const RAPIDAPI_KEY = "760540a073msh39d8377336215fbp1f2ad5jsndc6dd586ff8f";
const FANTASY_POSITIONS = ["QB", "RB", "WR", "TE", "K"];

const NFL_TEAMS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
  "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
  "LV", "LAC", "LAR", "MIA", "MIN", "NE", "NO", "NYG",
  "NYJ", "PIT", "PHI", "SF", "SEA", "TB", "TEN", "WSH",
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting full player stats import from RapidAPI...");

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let teamErrors = 0;

    // 1) Import individual player stats from team rosters (fantasy positions only)
    for (const teamAbv of NFL_TEAMS) {
      console.log(`Fetching roster + stats for ${teamAbv}...`);

      try {
        const response = await fetch(
          `https://${RAPIDAPI_HOST}/getNFLTeamRoster?teamAbv=${teamAbv}&getStats=true`,
          {
            headers: {
              "x-rapidapi-host": RAPIDAPI_HOST,
              "x-rapidapi-key": RAPIDAPI_KEY,
            },
          }
        );

        if (!response.ok) {
          console.error(`Failed to fetch ${teamAbv}: ${response.status}`);
          teamErrors++;
          continue;
        }

        const data = await response.json();

        if (data.statusCode !== 200 || !data.body?.roster) {
          console.error(`Unexpected response for ${teamAbv}`);
          teamErrors++;
          continue;
        }

        const roster = data.body.roster;

        for (const p of roster) {
          // Only import fantasy-relevant individual positions
          if (!p.pos || !FANTASY_POSITIONS.includes(p.pos)) {
            skipped++;
            continue;
          }

          const sleeperId = p.sleeperBotID;
          if (!sleeperId) {
            skipped++;
            continue;
          }

          const fullName = p.longName;
          if (!fullName) {
            skipped++;
            continue;
          }

          const nameParts = fullName.split(" ");
          const firstName = nameParts[0] || null;
          const lastName = nameParts.slice(1).join(" ") || null;

          // Build raw stats JSON blob from the full API response
          const rawStats: Record<string, unknown> = {};
          if (p.stats) {
            rawStats.stats = p.stats;
          }
          rawStats.espnID = p.espnID || null;
          rawStats.yahooPlayerID = p.yahooPlayerID || null;
          rawStats.cbsPlayerID = p.cbsPlayerID || null;
          rawStats.fantasyProsPlayerID = p.fantasyProsPlayerID || null;
          rawStats.rotoWirePlayerID = p.rotoWirePlayerID || null;
          rawStats.lastGamePlayed = p.lastGamePlayed || null;
          rawStats.isFreeAgent = p.isFreeAgent || null;
          rawStats.bDay = p.bDay || null;

          // Calculate season fantasy points from stats if available
          let seasonPoints: number | null = null;
          if (p.stats) {
            seasonPoints = calculateFantasyPoints(p.stats);
          }

          const existing = await db
            .select({ id: players.id })
            .from(players)
            .where(eq(players.sleeperId, sleeperId))
            .limit(1);

          const playerData = {
            sleeperId,
            rapidApiId: p.playerID || null,
            fullName,
            firstName,
            lastName,
            team: p.team || teamAbv,
            position: p.pos,
            status: p.isFreeAgent === "True" ? "Free Agent" : "Active",
            injuryStatus: p.injury?.designation || null,
            age: p.age ? parseInt(p.age) : null,
            yearsExp:
              p.exp && p.exp !== "R"
                ? parseInt(p.exp)
                : p.exp === "R"
                  ? 0
                  : null,
            number: p.jerseyNum ? parseInt(p.jerseyNum) : null,
            height: p.height || null,
            weight: p.weight || null,
            college: p.school || null,
            headshotUrl: p.espnHeadshot || null,
            rawStats: JSON.stringify(rawStats),
            seasonPoints,
            updatedAt: new Date(),
          };

          if (existing.length > 0) {
            await db
              .update(players)
              .set(playerData)
              .where(eq(players.sleeperId, sleeperId));
            updated++;
          } else {
            await db.insert(players).values(playerData);
            created++;
          }
        }

        console.log(
          `${teamAbv}: processed roster (running total: ${created} created, ${updated} updated)`
        );
      } catch (err) {
        console.error(`Error processing ${teamAbv}:`, err);
        teamErrors++;
      }
    }

    // 2) Import team defense stats from getNFLTeams
    console.log("Importing team defense stats...");
    try {
      const teamsResponse = await fetch(
        `https://${RAPIDAPI_HOST}/getNFLTeams?teamStats=true`,
        {
          headers: {
            "x-rapidapi-host": RAPIDAPI_HOST,
            "x-rapidapi-key": RAPIDAPI_KEY,
          },
        }
      );

      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        if (teamsData.statusCode === 200 && Array.isArray(teamsData.body)) {
          for (const team of teamsData.body) {
            const teamAbv = team.teamAbv;
            if (!teamAbv) continue;

            const defSleeperId = `DEF_${teamAbv}`;
            const fullName = `${team.teamCity} ${team.teamName}`;

            // Build raw stats for team defense
            const rawStats: Record<string, unknown> = {
              stats: team.teamStats || null,
              wins: team.wins || null,
              loss: team.loss || null,
              tie: team.tie || null,
              pf: team.pf || null,
              pa: team.pa || null,
              conference: team.conference || null,
              division: team.division || null,
              currentStreak: team.currentStreak || null,
            };

            // Calculate DEF fantasy points from team defensive stats
            let seasonPoints: number | null = null;
            if (team.teamStats?.Defense) {
              seasonPoints = calculateDefFantasyPoints(
                team.teamStats.Defense,
                parseInt(team.pa) || 0,
                parseInt(team.wins) || 0
              );
            }

            const existing = await db
              .select({ id: players.id })
              .from(players)
              .where(eq(players.sleeperId, defSleeperId))
              .limit(1);

            const defData = {
              sleeperId: defSleeperId,
              rapidApiId: `DEF_${team.teamID || teamAbv}`,
              fullName,
              firstName: team.teamCity || null,
              lastName: team.teamName || null,
              team: teamAbv,
              position: "DEF",
              status: "Active",
              injuryStatus: null,
              age: null,
              yearsExp: null,
              number: null,
              height: null,
              weight: null,
              college: null,
              headshotUrl: team.espnLogo1 || team.nflComLogo1 || null,
              rawStats: JSON.stringify(rawStats),
              seasonPoints,
              updatedAt: new Date(),
            };

            if (existing.length > 0) {
              await db
                .update(players)
                .set(defData)
                .where(eq(players.sleeperId, defSleeperId));
              updated++;
            } else {
              await db.insert(players).values(defData);
              created++;
            }
          }
          console.log("Team defense stats imported.");
        }
      }
    } catch (err) {
      console.error("Error importing team defense stats:", err);
      teamErrors++;
    }

    console.log(
      `Stats import complete. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Team errors: ${teamErrors}`
    );

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      teamErrors,
      message: `Imported stats for ${created + updated} players (${created} new, ${updated} updated, includes team DEFs)${teamErrors > 0 ? `. ${teamErrors} team(s) had errors.` : ""}`,
    });
  } catch (error) {
    console.error("Error importing player stats:", error);
    return NextResponse.json(
      {
        error: "Failed to import player stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate standard fantasy points for individual players.
 * 0.04 per pass yard, 4 per pass TD, -2 per INT,
 * 0.1 per rush yard, 6 per rush TD, 0.1 per rec yard, 6 per rec TD,
 * -2 per fumble lost.
 */
function calculateFantasyPoints(
  stats: Record<string, unknown>
): number | null {
  let points = 0;
  let hasData = false;

  const passing = stats.Passing as Record<string, string> | undefined;
  if (passing) {
    hasData = true;
    points += (parseFloat(passing.passYds) || 0) * 0.04;
    points += (parseFloat(passing.passTD) || 0) * 4;
    points -= (parseFloat(passing.int) || 0) * 2;
  }

  const rushing = stats.Rushing as Record<string, string> | undefined;
  if (rushing) {
    hasData = true;
    points += (parseFloat(rushing.rushYds) || 0) * 0.1;
    points += (parseFloat(rushing.rushTD) || 0) * 6;
  }

  const receiving = stats.Receiving as Record<string, string> | undefined;
  if (receiving) {
    hasData = true;
    points += (parseFloat(receiving.recYds) || 0) * 0.1;
    points += (parseFloat(receiving.recTD) || 0) * 6;
  }

  const defense = stats.Defense as Record<string, string> | undefined;
  if (defense) {
    points -= (parseFloat(defense.fumblesLost) || 0) * 2;
  }

  return hasData ? Math.round(points * 100) / 100 : null;
}

/**
 * Calculate standard fantasy points for team defense.
 * Base 10 points, adjusted by: sacks, INTs, fumble recoveries,
 * defensive TDs, safeties, and points allowed bracket.
 */
function calculateDefFantasyPoints(
  defStats: Record<string, string>,
  pointsAllowed: number,
  wins: number
): number {
  let points = 0;

  points += (parseFloat(defStats.sacks) || 0) * 1;
  points += (parseFloat(defStats.defensiveInterceptions) || 0) * 2;
  points += (parseFloat(defStats.fumblesRecovered) || 0) * 2;
  points += (parseFloat(defStats.defTD) || 0) * 6;

  // Points allowed bracket (season-long approximation per game average)
  const gamesPlayed = wins + (parseInt(defStats.loss as string) || 0);
  const paPerGame = gamesPlayed > 0 ? pointsAllowed / gamesPlayed : 30;

  if (paPerGame < 7) points += 10 * gamesPlayed;
  else if (paPerGame < 14) points += 7 * gamesPlayed;
  else if (paPerGame < 21) points += 4 * gamesPlayed;
  else if (paPerGame < 28) points += 1 * gamesPlayed;
  else if (paPerGame < 35) points -= 1 * gamesPlayed;
  else points -= 4 * gamesPlayed;

  return Math.round(points * 100) / 100;
}
