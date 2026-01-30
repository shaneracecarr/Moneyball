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
}

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
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
      <div className="space-y-1">
        {slots.map((slot) => {
          const entry = roster.find((r) => r.slot === slot);
          const isSelected =
            placingPlayer && entry && entry.id === placingPlayer.rosterPlayerId;
          const isEligible = eligibleSlots?.has(slot) ?? false;
          const isPlacingMode = !!placingPlayer;
          const isIneligible = isPlacingMode && !isEligible && !isSelected;

          let borderClass = "border-gray-200";
          let bgClass = entry ? "bg-white" : "bg-gray-50";
          let ringClass = "";
          let cursorClass = "";

          if (isSelected) {
            borderClass = "border-indigo-400";
            bgClass = "bg-indigo-50";
            ringClass = "ring-2 ring-indigo-400";
            cursorClass = "cursor-pointer";
          } else if (isEligible) {
            borderClass = "border-green-400";
            bgClass = entry ? "bg-green-50" : "bg-green-50";
            ringClass = "ring-2 ring-green-400";
            cursorClass = "cursor-pointer";
          } else if (isIneligible) {
            bgClass = entry ? "bg-white" : "bg-gray-50";
          }

          if (!entry && !isEligible && !isSelected) {
            borderClass = "border-dashed border-gray-300";
          }

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
              } ${!isPlacingMode && entry ? "cursor-pointer" : ""} transition-all`}
              onClick={handleRowClick}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 w-10 text-center bg-gray-100 rounded px-1.5 py-0.5">
                  {slotLabels[slot] || slot}
                </span>
                {entry ? (
                  <div>
                    <PlayerNameLink
                      playerId={entry.playerId}
                      playerName={entry.playerName}
                      className="text-sm font-medium"
                    />
                    <p className="text-xs text-gray-500">
                      {entry.playerPosition}
                      {entry.playerTeam ? ` - ${entry.playerTeam}` : ""}
                      {entry.playerInjuryStatus && (
                        <span className="ml-1 text-red-500">({entry.playerInjuryStatus})</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Empty</p>
                )}
              </div>
              {entry && (
                <span className="text-xs text-gray-400 tabular-nums">
                  Week Pts: —
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
