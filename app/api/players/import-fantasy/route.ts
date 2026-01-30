import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const RAPIDAPI_HOST =
  "tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com";
const RAPIDAPI_KEY = "760540a073msh39d8377336215fbp1f2ad5jsndc6dd586ff8f";
const FANTASY_POSITIONS = ["QB", "RB", "WR", "TE", "K"];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting fantasy player import from RapidAPI...");

    // 1) Import individual fantasy-position players
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/getNFLPlayerList`,
      {
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.statusCode !== 200 || !Array.isArray(data.body)) {
      throw new Error("Unexpected API response format");
    }

    const allPlayers = data.body;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const p of allPlayers) {
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
        team: p.team || null,
        position: p.pos,
        status: p.isFreeAgent === "True" ? "Free Agent" : "Active",
        injuryStatus: p.injury?.designation || null,
        age: p.age ? parseInt(p.age) : null,
        yearsExp: p.exp && p.exp !== "R" ? parseInt(p.exp) : p.exp === "R" ? 0 : null,
        number: p.jerseyNum ? parseInt(p.jerseyNum) : null,
        height: p.height || null,
        weight: p.weight || null,
        college: p.school || null,
        headshotUrl: p.espnHeadshot || null,
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

      if ((created + updated) % 100 === 0) {
        console.log(`Processed ${created + updated} fantasy players...`);
      }
    }

    // 2) Import team defenses (DEF) from getNFLTeams
    console.log("Importing team defenses...");
    const teamsResponse = await fetch(
      `https://${RAPIDAPI_HOST}/getNFLTeams`,
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

          // Use a stable sleeper-style ID for team defenses
          const defSleeperId = `DEF_${teamAbv}`;
          const fullName = `${team.teamCity} ${team.teamName}`;

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
        console.log("Team defenses imported.");
      }
    }

    console.log(
      `Fantasy import complete. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`
    );

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      message: `Imported ${created + updated} fantasy players (${created} new, ${updated} updated, includes 32 team DEFs)`,
    });
  } catch (error) {
    console.error("Error importing fantasy players:", error);
    return NextResponse.json(
      {
        error: "Failed to import fantasy players",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
