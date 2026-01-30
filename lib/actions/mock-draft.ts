"use server";

import { db } from "@/lib/db/index";
import { players } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { inArray } from "drizzle-orm";

const MOCK_DRAFT_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

export async function getAllPlayersAction() {
  const allPlayers = await db
    .select({
      id: players.id,
      fullName: players.fullName,
      position: players.position,
      team: players.team,
    })
    .from(players)
    .where(inArray(players.position, MOCK_DRAFT_POSITIONS))
    .orderBy(asc(players.fullName));

  return { players: allPlayers };
}
