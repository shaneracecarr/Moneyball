/**
 * Fantasy scoring utilities for calculating player and team scores.
 * Used by league-phase.ts and admin-week.ts for regular league scoring.
 */

type RosterPlayer = {
  playerId: string;
  playerPosition: string;
  playerAdp: number | null;
  slot: string;
};

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

  // Apply variance: +/-40% swing
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
