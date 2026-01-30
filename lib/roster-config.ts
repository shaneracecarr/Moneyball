import type { LeagueSettings } from "./league-settings";

export interface SlotConfig {
  starterSlots: string[];
  benchSlots: string[];
  irSlots: string[];
  allSlots: string[];
  totalSlots: number;
  slotLabels: Record<string, string>;
  slotAllowedPositions: Record<string, string[]>;
  positionToStarterSlots: Record<string, string[]>;
}

function generateNumberedSlots(prefix: string, count: number): string[] {
  if (count === 0) return [];
  if (count === 1) return [prefix];
  return Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
}

export function generateSlotConfig(settings: LeagueSettings): SlotConfig {
  const qbSlots = generateNumberedSlots("QB", settings.qbCount);
  const rbSlots = generateNumberedSlots("RB", settings.rbCount);
  const wrSlots = generateNumberedSlots("WR", settings.wrCount);
  const teSlots = generateNumberedSlots("TE", settings.teCount);
  const flexSlots = generateNumberedSlots("FLEX", settings.flexCount);
  const kSlots = generateNumberedSlots("K", settings.kCount);
  const defSlots = generateNumberedSlots("DEF", settings.defCount);

  const starterSlots = [
    ...qbSlots, ...rbSlots, ...wrSlots, ...teSlots,
    ...flexSlots, ...kSlots, ...defSlots,
  ];

  const benchSlots = Array.from(
    { length: settings.benchCount },
    (_, i) => `BN${i + 1}`
  );

  const irSlots = Array.from(
    { length: settings.irCount },
    (_, i) => `IR${i + 1}`
  );

  const allSlots = [...starterSlots, ...benchSlots, ...irSlots];

  const slotLabels: Record<string, string> = {};
  for (const s of qbSlots) slotLabels[s] = "QB";
  for (const s of rbSlots) slotLabels[s] = "RB";
  for (const s of wrSlots) slotLabels[s] = "WR";
  for (const s of teSlots) slotLabels[s] = "TE";
  for (const s of flexSlots) slotLabels[s] = "FLEX";
  for (const s of kSlots) slotLabels[s] = "K";
  for (const s of defSlots) slotLabels[s] = "DEF";
  for (const s of benchSlots) slotLabels[s] = "BN";
  for (const s of irSlots) slotLabels[s] = "IR";

  const slotAllowedPositions: Record<string, string[]> = {};
  for (const s of qbSlots) slotAllowedPositions[s] = ["QB"];
  for (const s of rbSlots) slotAllowedPositions[s] = ["RB"];
  for (const s of wrSlots) slotAllowedPositions[s] = ["WR"];
  for (const s of teSlots) slotAllowedPositions[s] = ["TE"];
  for (const s of flexSlots) slotAllowedPositions[s] = ["RB", "WR", "TE"];
  for (const s of kSlots) slotAllowedPositions[s] = ["K"];
  for (const s of defSlots) slotAllowedPositions[s] = ["DEF"];
  for (const s of benchSlots) slotAllowedPositions[s] = [];
  for (const s of irSlots) slotAllowedPositions[s] = [];

  const positionToStarterSlots: Record<string, string[]> = {
    QB: [...qbSlots],
    RB: [...rbSlots, ...flexSlots],
    WR: [...wrSlots, ...flexSlots],
    TE: [...teSlots, ...flexSlots],
    K: [...kSlots],
    DEF: [...defSlots],
  };

  return {
    starterSlots,
    benchSlots,
    irSlots,
    allSlots,
    totalSlots: allSlots.length,
    slotLabels,
    slotAllowedPositions,
    positionToStarterSlots,
  };
}
