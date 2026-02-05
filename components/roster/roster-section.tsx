"use client";

import { PlayerNameLink } from "@/components/player-card/player-name-link";

export type RosterEntry = {
  id: string;
  memberId: string;
  playerId: string;
  slot: string;
  acquiredVia: string;
  acquiredAt: Date;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
  playerInjuryStatus: string | null;
  playerStatus: string | null;
};

export type PlacingPlayer = {
  rosterPlayerId: string;
  playerPosition: string;
  playerInjuryStatus: string | null;
  currentSlot: string;
} | null;

interface RosterSectionProps {
  title: string;
  slots: string[];
  roster: RosterEntry[];
  allRoster: RosterEntry[];
  placingPlayer: PlacingPlayer;
  onSelectPlayer: (entry: RosterEntry) => void;
  onSlotClick: (slot: string) => void;
  moving: boolean;
  slotLabels: Record<string, string>;
  slotAllowedPositions: Record<string, string[]>;
  allStarterSlots: string[];
  allBenchSlots: string[];
  allIRSlots: string[];
  selectedWeek: number;
}

// Faux matchups - in the future this will come from the NFL schedule database
const FAUX_MATCHUPS: Record<string, string> = {
  BUF: "vs NYG",
  NYG: "@ BUF",
  KC: "vs LV",
  LV: "@ KC",
  PHI: "vs DAL",
  DAL: "@ PHI",
  SF: "vs SEA",
  SEA: "@ SF",
  MIA: "vs NE",
  NE: "@ MIA",
  DET: "vs CHI",
  CHI: "@ DET",
  BAL: "vs CIN",
  CIN: "@ BAL",
  CLE: "vs PIT",
  PIT: "@ CLE",
  LAC: "vs DEN",
  DEN: "@ LAC",
  MIN: "vs GB",
  GB: "@ MIN",
  NO: "vs ATL",
  ATL: "@ NO",
  TB: "vs CAR",
  CAR: "@ TB",
  ARI: "vs LAR",
  LAR: "@ ARI",
  JAX: "vs TEN",
  TEN: "@ JAX",
  IND: "vs HOU",
  HOU: "@ IND",
  NYJ: "vs WAS",
  WAS: "@ NYJ",
};

function getEligibleSlots(
  playerPosition: string,
  playerInjuryStatus: string | null,
  currentSlot: string,
  slotAllowedPositions: Record<string, string[]>,
  allStarterSlots: string[],
  allBenchSlots: string[],
  allIRSlots: string[]
): Set<string> {
  const slots = new Set<string>();

  // Check each starter slot for position compatibility
  for (const slot of allStarterSlots) {
    const allowed = slotAllowedPositions[slot];
    if (allowed && allowed.length > 0 && allowed.includes(playerPosition)) {
      slots.add(slot);
    }
  }

  // Bench slots accept any position
  for (const slot of allBenchSlots) {
    slots.add(slot);
  }

  // IR only if injured
  if (playerInjuryStatus) {
    for (const slot of allIRSlots) {
      slots.add(slot);
    }
  }

  slots.delete(currentSlot);
  return slots;
}

// Position colors for the slot badges
const POSITION_COLORS: Record<string, string> = {
  QB: "bg-red-500/20 text-red-400 border-red-500/30",
  RB: "bg-green-500/20 text-green-400 border-green-500/30",
  WR: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  TE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  K: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DEF: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  FLEX: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BN: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  IR: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function RosterSection({
  title,
  slots,
  roster,
  allRoster,
  placingPlayer,
  onSelectPlayer,
  onSlotClick,
  moving,
  slotLabels,
  slotAllowedPositions,
  allStarterSlots,
  allBenchSlots,
  allIRSlots,
  selectedWeek,
}: RosterSectionProps) {
  const eligibleSlots = placingPlayer
    ? getEligibleSlots(
        placingPlayer.playerPosition,
        placingPlayer.playerInjuryStatus,
        placingPlayer.currentSlot,
        slotAllowedPositions,
        allStarterSlots,
        allBenchSlots,
        allIRSlots
      )
    : null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{title}</h3>
      <div className="space-y-1">
        {slots.map((slot) => {
          const entry = roster.find((r) => r.slot === slot);
          const isSelected =
            placingPlayer && entry && entry.id === placingPlayer.rosterPlayerId;
          const isEligible = eligibleSlots?.has(slot) ?? false;
          const isPlacingMode = !!placingPlayer;
          const isIneligible = isPlacingMode && !isEligible && !isSelected;

          const slotLabel = slotLabels[slot] || slot;
          const slotColor = POSITION_COLORS[slotLabel] || POSITION_COLORS.BN;

          let borderClass = "border-gray-700";
          let bgClass = entry ? "bg-[#1e2128]" : "bg-[#1a1d24]";
          let ringClass = "";
          let cursorClass = "";

          if (isSelected) {
            borderClass = "border-purple-500";
            bgClass = "bg-purple-500/10";
            ringClass = "ring-2 ring-purple-500";
            cursorClass = "cursor-pointer";
          } else if (isEligible) {
            borderClass = "border-green-500";
            bgClass = entry ? "bg-green-500/10" : "bg-green-500/10";
            ringClass = "ring-2 ring-green-500";
            cursorClass = "cursor-pointer";
          } else if (isIneligible) {
            bgClass = entry ? "bg-[#1e2128]" : "bg-[#1a1d24]";
          }

          if (!entry && !isEligible && !isSelected) {
            borderClass = "border-dashed border-gray-600";
          }

          // Get matchup for player's team
          const matchup = entry?.playerTeam ? FAUX_MATCHUPS[entry.playerTeam] || "BYE" : null;

          function handleRowClick() {
            if (moving) return;
            if (isSelected) {
              // Deselect
              onSelectPlayer(entry!);
              return;
            }
            if (isEligible) {
              onSlotClick(slot);
              return;
            }
            if (!isPlacingMode && entry) {
              onSelectPlayer(entry);
            }
          }

          return (
            <div
              key={slot}
              className={`flex items-center justify-between p-3 rounded-lg border ${borderClass} ${bgClass} ${ringClass} ${cursorClass} ${
                isIneligible ? "opacity-50" : ""
              } ${!isPlacingMode && entry ? "cursor-pointer hover:bg-[#2a2f38]" : ""} transition-all`}
              onClick={handleRowClick}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold w-12 text-center border rounded px-1.5 py-0.5 ${slotColor}`}>
                  {slotLabel}
                </span>
                {entry ? (
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <PlayerNameLink
                        playerId={entry.playerId}
                        playerName={entry.playerName}
                        className="text-sm font-medium text-white hover:text-purple-400"
                      />
                      {entry.playerInjuryStatus && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                          {entry.playerInjuryStatus}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{entry.playerPosition}</span>
                      {entry.playerTeam && (
                        <>
                          <span>-</span>
                          <span>{entry.playerTeam}</span>
                        </>
                      )}
                      {matchup && (
                        <>
                          <span className="text-gray-600">|</span>
                          <span className={matchup === "BYE" ? "text-yellow-500" : "text-gray-300"}>
                            {matchup}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Empty</p>
                )}
              </div>
              {entry && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-white tabular-nums">11</p>
                  <p className="text-xs text-gray-500">Proj Pts</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
