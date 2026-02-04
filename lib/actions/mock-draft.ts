"use server";

import { db } from "@/lib/db/index";
import { players } from "@/lib/db/schema";
import { asc, sql } from "drizzle-orm";
import { inArray, isNotNull } from "drizzle-orm";

const MOCK_DRAFT_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

export async function getAllPlayersAction() {
  const allPlayers = await db
    .select({
      id: players.id,
      fullName: players.fullName,
      position: players.position,
      team: players.team,
      adp: players.adp,
    })
    .from(players)
    .where(inArray(players.position, MOCK_DRAFT_POSITIONS))
    .orderBy(
      // Sort by ADP (nulls last), then by name as fallback
      sql`CASE WHEN ${players.adp} IS NULL THEN 1 ELSE 0 END`,
      asc(players.adp),
      asc(players.fullName)
    );

  return { players: allPlayers };
}
