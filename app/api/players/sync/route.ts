import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertPlayer, deleteAllPlayers } from "@/lib/db/queries";

const ALLOWED_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting player sync...");

    // Fetch players from Sleeper API
    const response = await fetch("https://api.sleeper.app/v1/players/nfl");

    if (!response.ok) {
      throw new Error("Failed to fetch players from Sleeper API");
    }

    const playersData = await response.json();

    console.log("Fetched players data from Sleeper API");

    // Clear existing players
    await deleteAllPlayers();

    console.log("Cleared existing players");

    // Process players
    let syncedCount = 0;
    let skippedCount = 0;

    const playerIds = Object.keys(playersData);

    for (const sleeperId of playerIds) {
      const player = playersData[sleeperId];

      // Skip if not in allowed positions
      if (!player.position || !ALLOWED_POSITIONS.includes(player.position)) {
        skippedCount++;
        continue;
      }

      // Construct full name for DEF players (Sleeper stores them without full_name)
      let fullName = player.full_name;
      if (!fullName && player.position === "DEF") {
        if (player.first_name && player.last_name) {
          fullName = `${player.first_name} ${player.last_name}`;
        } else if (player.team) {
          fullName = `${player.team} Defense`;
        }
      }

      // Skip if still no name
      if (!fullName) {
        skippedCount++;
        continue;
      }

      await upsertPlayer({
        sleeperId: sleeperId,
        fullName: fullName,
        firstName: player.first_name || null,
        lastName: player.last_name || null,
        team: player.team || null,
        position: player.position,
        status: player.status || null,
        injuryStatus: player.injury_status || null,
        age: player.age ? parseInt(player.age) : null,
        yearsExp: player.years_exp !== undefined ? parseInt(player.years_exp) : null,
        number: player.number ? parseInt(player.number) : null,
        adp: player.search_rank ? parseFloat(player.search_rank) : null,
      });

      syncedCount++;

      // Log progress every 100 players
      if (syncedCount % 100 === 0) {
        console.log(`Synced ${syncedCount} players...`);
      }
    }

    console.log(`Player sync complete. Synced: ${syncedCount}, Skipped: ${skippedCount}`);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      skipped: skippedCount,
      message: `Successfully synced ${syncedCount} players`,
    });
  } catch (error) {
    console.error("Error syncing players:", error);
    return NextResponse.json(
      {
        error: "Failed to sync players",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
