import type { SlotConfig } from "./roster-config";

export const AI_TEAM_NAMES = [
  "Alpha Squad",
  "Bravo Bombers",
  "Charlie Chargers",
  "Delta Force",
  "Echo Eagles",
  "Foxtrot Falcons",
  "Golf Giants",
  "Hotel Hawks",
  "India Ironmen",
  "Juliet Jaguars",
  "Kilo Knights",
  "Lima Lions",
  "Mike Mustangs",
  "November Ninjas",
];

type RosterPlayer = {
  playerId: string;
  playerPosition: string;
  playerAdp: number | null;
  slot: string;
};

type DraftablePlayer = {
  id: string;
  fullName: string;
  position: string;
  team: string | null;
  adp: number | null;
};

// Position priority by draft round (same logic as existing mock-draft-board)
function getPositionPriority(round: number): string[] {
  if (round <= 2) return ["RB", "WR"];
  if (round <= 4) return ["RB", "WR", "QB"];
  if (round <= 8) return ["WR", "RB", "TE", "QB"];
  if (round <= 12) return ["WR", "RB", "TE", "QB", "K"];
  return ["K", "DEF", "WR", "RB", "TE", "QB"];
}

export function botDraftPick(
  availablePlayers: DraftablePlayer[],
  round: number,
  teamPositions: Record<string, number>
): DraftablePlayer | undefined {
  const priorities = getPositionPriority(round);

  // Sort available by ADP (lower = better, nulls last)
  const sorted = [...availablePlayers].sort((a, b) => {
    if (a.adp === null && b.adp === null) return 0;
    if (a.adp === null) return 1;
    if (b.adp === null) return -1;
    return a.adp - b.adp;
  });

  for (const pos of priorities) {
    const candidates = sorted.filter((p) => p.position === pos);
    if (candidates.length > 0) {
      // Pick from top 3 for some variety
      const pool = candidates.slice(0, Math.min(3, candidates.length));
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // Fallback: best available by ADP
  return sorted[0];
}

export function generatePlayerScore(
  adp: number | null,
  position: string
): number {
  const effectiveAdp = adp ?? 300;
  const adpFactor = Math.max(0, 300 - effectiveAdp);

  let base: number;
  switch (position) {
    case "QB":
      base = 14 + adpFactor * 0.03;
      break;
    case "RB":
      base = 8 + adpFactor * 0.035;
      break;
    case "WR":
      base = 8 + adpFactor * 0.03;
      break;
    case "TE":
      base = 5 + adpFactor * 0.025;
      break;
    case "K":
      base = 6 + Math.random() * 6;
      break;
    case "DEF":
      base = 5 + Math.random() * 8;
      break;
    default:
      base = 5;
  }

  // Apply variance: ±40% swing
  const variance = 0.6 + Math.random() * 0.8;
  const score = base * variance;

  // Occasional boom game (~10% chance for skill positions)
  if (
    position !== "K" &&
    position !== "DEF" &&
    Math.random() < 0.1
  ) {
    return Math.round((score * 1.8) * 10) / 10;
  }

  // Occasional bust game (~8% chance)
  if (Math.random() < 0.08) {
    return Math.round(Math.max(0, score * 0.3) * 10) / 10;
  }

  return Math.round(Math.max(0, score) * 10) / 10;
}

export function calculateTeamScore(
  roster: RosterPlayer[],
  starterSlots: string[]
): number {
  const starterSlotSet = new Set(starterSlots);
  let total = 0;

  for (const player of roster) {
    if (starterSlotSet.has(player.slot)) {
      total += generatePlayerScore(player.playerAdp, player.playerPosition);
    }
  }

  return Math.round(total * 10) / 10;
}

export function botOptimizeLineup(
  roster: RosterPlayer[],
  slotConfig: SlotConfig
): { fromSlot: string; toSlot: string }[] {
  // Sort players by ADP (lower = better)
  const playersByPosition = new Map<string, RosterPlayer[]>();
  for (const p of roster) {
    const list = playersByPosition.get(p.playerPosition) || [];
    list.push(p);
    playersByPosition.set(p.playerPosition, list);
  }

  // Sort each position group by ADP (best first)
  for (const [, players] of Array.from(playersByPosition.entries())) {
    players.sort((a, b) => {
      if (a.playerAdp === null && b.playerAdp === null) return 0;
      if (a.playerAdp === null) return 1;
      if (b.playerAdp === null) return -1;
      return a.playerAdp - b.playerAdp;
    });
  }

  const moves: { fromSlot: string; toSlot: string }[] = [];
  const assigned = new Set<string>(); // slots that are assigned
  const usedPlayers = new Set<string>(); // player IDs that are placed

  // First pass: assign best players to starter slots
  for (const starterSlot of slotConfig.starterSlots) {
    const allowedPositions = slotConfig.slotAllowedPositions[starterSlot];
    if (!allowedPositions || allowedPositions.length === 0) continue;

    let bestPlayer: RosterPlayer | null = null;
    for (const pos of allowedPositions) {
      const candidates = playersByPosition.get(pos) || [];
      for (const c of candidates) {
        if (usedPlayers.has(c.playerId)) continue;
        if (!bestPlayer) {
          bestPlayer = c;
        } else {
          const bAdp = bestPlayer.playerAdp ?? 999;
          const cAdp = c.playerAdp ?? 999;
          if (cAdp < bAdp) bestPlayer = c;
        }
      }
    }

    if (bestPlayer) {
      usedPlayers.add(bestPlayer.playerId);
      assigned.add(starterSlot);
      if (bestPlayer.slot !== starterSlot) {
        moves.push({ fromSlot: bestPlayer.slot, toSlot: starterSlot });
      }
    }
  }

  return moves;
}
