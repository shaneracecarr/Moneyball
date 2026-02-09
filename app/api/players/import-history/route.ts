import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { players, playerGameStats } from "@/lib/db/schema";
import { eq, and, inArray, isNotNull, or } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for Vercel

const RAPIDAPI_HOST = "tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com";
const FANTASY_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];
const SEASONS = [2024, 2023, 2022]; // Past 3 years

// Rate limiting - RapidAPI has limits
const DELAY_BETWEEN_REQUESTS = 200; // ms

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseGameId(gameId: string): { date: string; away: string; home: string; isHome: boolean; opponent: string } | null {
  // Format: "20240211_SF@KC" or "20240211_KC@SF"
  const match = gameId.match(/^(\d{8})_([A-Z]+)@([A-Z]+)$/);
  if (!match) return null;

  const [, date, away, home] = match;
  return { date, away, home, isHome: false, opponent: "" }; // Will be set based on player team
}

function parseStats(gameData: any, playerTeam: string | null) {
  const gameInfo = parseGameId(gameData.gameID);
  const isHome = gameInfo ? gameInfo.home === playerTeam : false;
  const opponent = gameInfo
    ? (isHome ? gameInfo.away : gameInfo.home)
    : null;

  // Parse sacked stats (format: "6-31" meaning 6 sacks for 31 yards lost)
  let timesSacked = 0;
  let sackYardsLost = 0;
  if (gameData.Passing?.sacked) {
    const sackParts = gameData.Passing.sacked.split("-");
    timesSacked = parseInt(sackParts[0]) || 0;
    sackYardsLost = parseInt(sackParts[1]) || 0;
  }

  // Parse game date from gameID
  let gameDate = null;
  if (gameInfo?.date) {
    const year = gameInfo.date.substring(0, 4);
    const month = gameInfo.date.substring(4, 6);
    const day = gameInfo.date.substring(6, 8);
    gameDate = `${year}-${month}-${day}`;
  }

  return {
    gameId: gameData.gameID,
    opponent,
    isHome,
    gameDate,

    // Passing
    passAttempts: parseInt(gameData.Passing?.passAttempts) || 0,
    passCompletions: parseInt(gameData.Passing?.passCompletions) || 0,
    passYards: parseInt(gameData.Passing?.passYds) || 0,
    passTds: parseInt(gameData.Passing?.passTD) || 0,
    passInts: parseInt(gameData.Passing?.int) || 0,
    passRating: parseFloat(gameData.Passing?.rtg) || null,
    qbr: parseFloat(gameData.Passing?.qbr) || null,
    timesSacked,
    sackYardsLost,

    // Rushing
    rushAttempts: parseInt(gameData.Rushing?.carries) || 0,
    rushYards: parseInt(gameData.Rushing?.rushYds) || 0,
    rushTds: parseInt(gameData.Rushing?.rushTD) || 0,
    rushLong: parseInt(gameData.Rushing?.longRush) || 0,

    // Receiving
    targets: parseInt(gameData.Receiving?.targets) || 0,
    receptions: parseInt(gameData.Receiving?.receptions) || 0,
    recYards: parseInt(gameData.Receiving?.recYds) || 0,
    recTds: parseInt(gameData.Receiving?.recTD) || 0,
    recLong: parseInt(gameData.Receiving?.longRec) || 0,

    // Kicking
    fgMade: parseInt(gameData.Kicking?.fgMade) || 0,
    fgAttempted: parseInt(gameData.Kicking?.fgAttempts) || 0,
    fgLong: parseInt(gameData.Kicking?.fgLong) || 0,
    xpMade: parseInt(gameData.Kicking?.xpMade) || 0,
    xpAttempted: parseInt(gameData.Kicking?.xpAttempts) || 0,

    // Defense (for individual players)
    defTackles: parseInt(gameData.Defense?.totalTackles) || 0,
    defSacks: parseFloat(gameData.Defense?.sacks) || 0,
    defInts: parseInt(gameData.Defense?.defensiveInterceptions) || 0,
    defFumblesForced: parseInt(gameData.Defense?.forcedFumbles) || 0,
    defFumblesRecovered: parseInt(gameData.Defense?.fumblesRecovered) || 0,
    defTds: parseInt(gameData.Defense?.defTD) || 0,

    // Fumbles
    fumbles: parseInt(gameData.Defense?.fumbles) || 0,
    fumblesLost: parseInt(gameData.Defense?.fumblesLost) || 0,

    // Snap counts
    offSnaps: parseInt(gameData.snapCounts?.offSnap) || 0,
    offSnapPct: parseFloat(gameData.snapCounts?.offSnapPct) || 0,
    defSnaps: parseInt(gameData.snapCounts?.defSnap) || 0,
    defSnapPct: parseFloat(gameData.snapCounts?.defSnapPct) || 0,

    // Fantasy points
    fantasyPointsStandard: parseFloat(gameData.fantasyPointsDefault?.standard) || null,
    fantasyPointsPpr: parseFloat(gameData.fantasyPointsDefault?.PPR) || null,
    fantasyPointsHalfPpr: parseFloat(gameData.fantasyPointsDefault?.halfPPR) || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RapidAPI key not configured" }, { status: 500 });
    }

    // Get query params for pagination/resuming
    const { searchParams } = new URL(request.url);
    const startOffset = parseInt(searchParams.get("offset") || "0");
    const batchSize = parseInt(searchParams.get("batchSize") || "50");

    console.log(`Starting historical stats import from offset ${startOffset}, batch size ${batchSize}...`);

    // Get active fantasy players with rapidApiId
    const activePlayers = await db
      .select({
        id: players.id,
        rapidApiId: players.rapidApiId,
        fullName: players.fullName,
        team: players.team,
        position: players.position,
      })
      .from(players)
      .where(
        and(
          inArray(players.position, FANTASY_POSITIONS),
          or(
            eq(players.status, "Active"),
            // Include kickers which might have null status
            and(eq(players.position, "K"), isNotNull(players.rapidApiId))
          ),
          isNotNull(players.rapidApiId)
        )
      )
      .limit(batchSize)
      .offset(startOffset);

    if (activePlayers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No more players to process",
        processed: 0,
        offset: startOffset,
        complete: true,
      });
    }

    let totalGamesImported = 0;
    let playersProcessed = 0;
    let errors: string[] = [];

    for (const player of activePlayers) {
      if (!player.rapidApiId) continue;

      // Skip DEF entries for now (they use teamID not playerID)
      if (player.position === "DEF") {
        playersProcessed++;
        continue;
      }

      try {
        for (const season of SEASONS) {
          const response = await fetch(
            `https://${RAPIDAPI_HOST}/getNFLGamesForPlayer?playerID=${player.rapidApiId}&season=${season}&fantasyPoints=true`,
            {
              headers: {
                "X-RapidAPI-Key": apiKey,
                "X-RapidAPI-Host": RAPIDAPI_HOST,
              },
            }
          );

          if (!response.ok) {
            if (response.status === 429) {
              // Rate limited - wait and retry
              await sleep(5000);
              continue;
            }
            console.error(`Failed to fetch ${player.fullName} for ${season}: ${response.status}`);
            continue;
          }

          const data = await response.json();

          if (data.statusCode !== 200 || !data.body) {
            continue;
          }

          const games = Object.values(data.body) as any[];

          for (const gameData of games) {
            if (!gameData.gameID) continue;

            const stats = parseStats(gameData, player.team);

            // Determine week from gameID date (rough estimate based on NFL schedule)
            // This is a simplification - real implementation would need game schedule lookup
            const gameIdDate = gameData.gameID.substring(0, 8);
            const gameMonth = parseInt(gameIdDate.substring(4, 6));
            const gameDay = parseInt(gameIdDate.substring(6, 8));

            // Rough week calculation (September = weeks 1-4, etc.)
            let week = 1;
            if (gameMonth >= 9 && gameMonth <= 12) {
              // Regular season Sept-Dec
              week = Math.min(18, Math.floor((gameMonth - 9) * 4 + gameDay / 7) + 1);
            } else if (gameMonth >= 1 && gameMonth <= 2) {
              // Playoffs Jan-Feb
              week = 19 + (gameMonth === 2 ? 2 : 0);
            }

            try {
              // Upsert the game stats
              await db
                .insert(playerGameStats)
                .values({
                  playerId: player.id,
                  season,
                  week,
                  ...stats,
                })
                .onConflictDoUpdate({
                  target: [playerGameStats.playerId, playerGameStats.gameId],
                  set: {
                    ...stats,
                    updatedAt: new Date(),
                  },
                });

              totalGamesImported++;
            } catch (dbError) {
              // Ignore duplicate key errors
              console.error(`DB error for ${player.fullName} game ${gameData.gameID}:`, dbError);
            }
          }

          await sleep(DELAY_BETWEEN_REQUESTS);
        }

        playersProcessed++;

        if (playersProcessed % 10 === 0) {
          console.log(`Processed ${playersProcessed}/${activePlayers.length} players, ${totalGamesImported} games imported`);
        }
      } catch (playerError) {
        errors.push(`${player.fullName}: ${playerError instanceof Error ? playerError.message : "Unknown error"}`);
      }
    }

    const nextOffset = startOffset + activePlayers.length;
    const isComplete = activePlayers.length < batchSize;

    console.log(`Batch complete. Processed: ${playersProcessed}, Games: ${totalGamesImported}, Next offset: ${nextOffset}`);

    return NextResponse.json({
      success: true,
      processed: playersProcessed,
      gamesImported: totalGamesImported,
      offset: startOffset,
      nextOffset,
      complete: isComplete,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      message: isComplete
        ? `Import complete! Processed ${playersProcessed} players, ${totalGamesImported} games imported.`
        : `Batch complete. Processed ${playersProcessed} players. Call again with offset=${nextOffset} to continue.`,
    });
  } catch (error) {
    console.error("Error importing historical stats:", error);
    return NextResponse.json(
      {
        error: "Failed to import historical stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
