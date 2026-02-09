import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { eq, like, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// RapidAPI Tank01 NFL endpoint
const RAPIDAPI_HOST = "tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting ADP import from RapidAPI...");

    // Get the API key from environment
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RapidAPI key not configured" }, { status: 500 });
    }

    // Fetch ADP data for half PPR (most common format)
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/getNFLADP?adpType=halfPPR`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ADP data: ${response.statusText}`);
    }

    const data = await response.json();
    const adpList = data.body?.adpList || [];

    console.log(`Fetched ${adpList.length} ADP entries`);

    let updatedCount = 0;
    let addedKickers = 0;
    let notFoundCount = 0;
    const notFound: string[] = [];

    for (const entry of adpList) {
      const { longName, overallADP, posADP } = entry;
      const adpValue = parseFloat(overallADP);

      if (!longName || isNaN(adpValue)) continue;

      // Skip DST entries (they have teamAbv instead of playerID)
      if (posADP?.startsWith("DST")) continue;

      // Try to find the player by name (exact match first, then fuzzy)
      let existingPlayer = await db
        .select()
        .from(players)
        .where(eq(players.fullName, longName))
        .limit(1);

      // If not found, try a fuzzy match
      if (!existingPlayer[0]) {
        // Try matching by last name + first initial
        const nameParts = longName.split(" ");
        if (nameParts.length >= 2) {
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ");
          existingPlayer = await db
            .select()
            .from(players)
            .where(
              or(
                like(players.fullName, `${firstName}%${lastName}`),
                like(players.fullName, `%${lastName}%`)
              )
            )
            .limit(1);
        }
      }

      if (existingPlayer[0]) {
        // Update the ADP
        await db
          .update(players)
          .set({ adp: adpValue })
          .where(eq(players.id, existingPlayer[0].id));
        updatedCount++;
      } else {
        // Player not found - if it's a kicker, add them
        if (posADP?.startsWith("K")) {
          const nameParts = longName.split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          await db.insert(players).values({
            sleeperId: `rapidapi_${entry.playerID || longName.replace(/\s+/g, "_")}`,
            fullName: longName,
            firstName,
            lastName,
            position: "K",
            team: null, // We don't have team info from ADP endpoint
            adp: adpValue,
          });
          addedKickers++;
        } else {
          notFound.push(longName);
          notFoundCount++;
        }
      }
    }

    console.log(`ADP import complete. Updated: ${updatedCount}, Added kickers: ${addedKickers}, Not found: ${notFoundCount}`);

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      addedKickers,
      notFound: notFoundCount,
      notFoundPlayers: notFound.slice(0, 20), // Only return first 20 for debugging
      message: `Updated ADP for ${updatedCount} players, added ${addedKickers} kickers`,
    });
  } catch (error) {
    console.error("Error importing ADP:", error);
    return NextResponse.json(
      {
        error: "Failed to import ADP",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
