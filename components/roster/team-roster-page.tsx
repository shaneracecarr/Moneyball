"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RosterSection, type RosterEntry, type PlacingPlayer } from "./roster-section";
import { FreeAgentSearch } from "./free-agent-search";
import {
  movePlayerAction,
  pickupPlayerAction,
  dropAndAddAction,
} from "@/lib/actions/roster";
import type { SlotConfig } from "@/lib/roster-config";

// Fallback defaults for backwards compatibility
const DEFAULT_STARTER_SLOTS = ["QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX", "K", "DEF"];
const DEFAULT_BENCH_SLOTS = ["BN1", "BN2", "BN3", "BN4", "BN5", "BN6", "BN7"];
const DEFAULT_IR_SLOTS = ["IR1", "IR2"];
const DEFAULT_TOTAL = 18;
const DEFAULT_SLOT_LABELS: Record<string, string> = {
  QB: "QB", RB1: "RB", RB2: "RB", WR1: "WR", WR2: "WR",
  TE: "TE", FLEX: "FLEX", K: "K", DEF: "DEF",
  BN1: "BN", BN2: "BN", BN3: "BN", BN4: "BN", BN5: "BN", BN6: "BN", BN7: "BN",
  IR1: "IR", IR2: "IR",
};
const DEFAULT_SLOT_ALLOWED: Record<string, string[]> = {
  QB: ["QB"], RB1: ["RB"], RB2: ["RB"], WR1: ["WR"], WR2: ["WR"],
  TE: ["TE"], FLEX: ["RB", "WR", "TE"], K: ["K"], DEF: ["DEF"],
};

interface TeamRosterPageProps {
  leagueId: string;
  starters: RosterEntry[];
  bench: RosterEntry[];
  ir: RosterEntry[];
  teamName: string | null;
  slotConfig?: SlotConfig;
  currentWeek: number;
  teamRecord?: { wins: number; losses: number; ties: number } | null;
}

function formatRecord(record: { wins: number; losses: number; ties: number } | null | undefined): string {
  if (!record) return "";
  const { wins, losses, ties } = record;
  if (ties > 0) return `(${wins}-${losses}-${ties})`;
  return `(${wins}-${losses})`;
}

export function TeamRosterPage({
  leagueId,
  starters,
  bench,
  ir,
  teamName,
  slotConfig,
  currentWeek,
  teamRecord,
}: TeamRosterPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [placingPlayer, setPlacingPlayer] = useState<PlacingPlayer>(null);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);

  const starterSlots = slotConfig?.starterSlots ?? DEFAULT_STARTER_SLOTS;
  const benchSlots = slotConfig?.benchSlots ?? DEFAULT_BENCH_SLOTS;
  const irSlots = slotConfig?.irSlots ?? DEFAULT_IR_SLOTS;
  const totalSlots = slotConfig?.totalSlots ?? DEFAULT_TOTAL;
  const slotLabels = slotConfig?.slotLabels ?? DEFAULT_SLOT_LABELS;
  const slotAllowedPositions = slotConfig?.slotAllowedPositions ?? DEFAULT_SLOT_ALLOWED;

  const allRoster = [...starters, ...bench, ...ir];
  const rosterFull = allRoster.length >= totalSlots;

  const exitPlacingMode = useCallback(() => {
    setPlacingPlayer(null);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") exitPlacingMode();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [exitPlacingMode]);

  function handleSelectPlayer(entry: RosterEntry) {
    if (placingPlayer && placingPlayer.rosterPlayerId === entry.id) {
      exitPlacingMode();
      return;
    }
    setPlacingPlayer({
      rosterPlayerId: entry.id,
      playerPosition: entry.playerPosition,
      playerInjuryStatus: entry.playerInjuryStatus,
      currentSlot: entry.slot,
    });
    setError(null);
  }

  function handleSlotClick(targetSlot: string) {
    if (!placingPlayer) return;
    setError(null);
    const formData = new FormData();
    formData.set("leagueId", leagueId);
    formData.set("rosterPlayerId", placingPlayer.rosterPlayerId);
    formData.set("targetSlot", targetSlot);
    exitPlacingMode();
    startTransition(async () => {
      const result = await movePlayerAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handlePickup(playerId: string) {
    setError(null);
    const formData = new FormData();
    formData.set("leagueId", leagueId);
    formData.set("playerId", playerId);
    startTransition(async () => {
      const result = await pickupPlayerAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDropAndAdd(dropRosterPlayerId: string, addPlayerId: string) {
    setError(null);
    const formData = new FormData();
    formData.set("leagueId", leagueId);
    formData.set("dropRosterPlayerId", dropRosterPlayerId);
    formData.set("addPlayerId", addPlayerId);
    startTransition(async () => {
      const result = await dropAndAddAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const sectionProps = {
    allRoster,
    placingPlayer,
    onSelectPlayer: handleSelectPlayer,
    onSlotClick: handleSlotClick,
    moving: isPending,
    slotLabels,
    slotAllowedPositions,
    allStarterSlots: starterSlots,
    allBenchSlots: benchSlots,
    allIRSlots: irSlots,
    selectedWeek,
  };

  return (
    <div className="space-y-6">
      {/* Team Name and Week Selector */}
      <div className="flex items-center justify-between">
        {teamName && (
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">{teamName}</h2>
            {teamRecord && (
              <span className="text-lg text-gray-400">{formatRecord(teamRecord)}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Viewing:</span>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="bg-[#1a1d24] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
              <option key={week} value={week}>
                Week {week} {week === currentWeek ? "(Current)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {placingPlayer && (
        <div className="bg-purple-500/20 border border-purple-500/50 text-purple-300 px-4 py-3 rounded-lg text-sm">
          Click a highlighted slot to move the player, or press Escape to cancel.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">My Roster</h3>
                <p className="text-sm text-gray-400 mt-1">{allRoster.length}/{totalSlots} players</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-6">
              <RosterSection
                title="Starters"
                slots={starterSlots}
                roster={starters}
                {...sectionProps}
              />
              <RosterSection
                title="Bench"
                slots={benchSlots}
                roster={bench}
                {...sectionProps}
              />
              <RosterSection
                title="Injured Reserve"
                slots={irSlots}
                roster={ir}
                {...sectionProps}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Add Players</h3>
              <p className="text-sm text-gray-400 mt-1">Browse free agents</p>
            </div>
            <div className="px-6 py-5">
              <FreeAgentSearch
                leagueId={leagueId}
                onPickup={handlePickup}
                onDropAndAdd={handleDropAndAdd}
                rosterFull={rosterFull}
                roster={allRoster}
                loading={isPending}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
