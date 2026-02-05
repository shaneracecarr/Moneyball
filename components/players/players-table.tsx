"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { pickupPlayerAction } from "@/lib/actions/roster";
import { PlayerNameLink } from "@/components/player-card/player-name-link";

interface Player {
  id: string;
  sleeperId: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  team: string | null;
  position: string;
  status: string | null;
  injuryStatus: string | null;
  age: number | null;
  yearsExp: number | null;
  number: number | null;
  adp: number | null;
  seasonPoints: number | null;
  headshotUrl: string | null;
  // Stats
  gamesPlayed: number | null;
  passAttempts: number | null;
  passCompletions: number | null;
  passYards: number | null;
  passTds: number | null;
  passInts: number | null;
  rushAttempts: number | null;
  rushYards: number | null;
  rushTds: number | null;
  targets: number | null;
  receptions: number | null;
  recYards: number | null;
  recTds: number | null;
  fgMade: number | null;
  fgAttempts: number | null;
  xpMade: number | null;
  xpAttempts: number | null;
  fantasyPts: number | null;
}

interface PlayersTableProps {
  players: Player[];
  activeLeagueId?: string | null;
  ownedPlayerIds?: string[];
  currentSort: string;
  currentSortDir: string;
  currentPosition: string;
}

const POSITION_COLORS: Record<string, string> = {
  QB: "bg-red-500/20 text-red-400 border-red-500/30",
  RB: "bg-green-500/20 text-green-400 border-green-500/30",
  WR: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  TE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  K: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DEF: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

type SortField = string;

export function PlayersTable({
  players,
  activeLeagueId,
  ownedPlayerIds = [],
  currentSort,
  currentSortDir,
  currentPosition,
}: PlayersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [actionPlayerId, setActionPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const ownedSet = new Set(ownedPlayerIds);

  function handleSort(field: SortField) {
    const params = new URLSearchParams(searchParams.toString());

    // Determine new sort direction
    let newDir: string;
    if (currentSort === field) {
      // Toggle direction
      newDir = currentSortDir === "asc" ? "desc" : "asc";
    } else {
      // New field: default to desc for stats, asc for adp/name
      newDir = field === "adp" || field === "name" ? "asc" : "desc";
    }

    params.set("sort", field);
    params.set("dir", newDir);
    params.set("page", "1");

    router.push(`/players?${params.toString()}`);
  }

  function handlePickup(playerId: string) {
    if (!activeLeagueId) return;
    setError(null);
    setSuccessMsg(null);
    setActionPlayerId(playerId);
    const formData = new FormData();
    formData.set("leagueId", activeLeagueId);
    formData.set("playerId", playerId);
    startTransition(async () => {
      const result = await pickupPlayerAction(formData);
      setActionPlayerId(null);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMsg("Player added to your team!");
        router.refresh();
      }
    });
  }

  // Column header component with sort indicator
  function SortableHeader({ field, label, className = "" }: { field: SortField; label: string; className?: string }) {
    const isActive = currentSort === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-2 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none ${className}`}
      >
        <div className="flex items-center justify-end gap-1">
          <span>{label}</span>
          {isActive && (
            <span className="text-purple-400">
              {currentSortDir === "asc" ? "↑" : "↓"}
            </span>
          )}
        </div>
      </th>
    );
  }

  // Determine which stat columns to show based on position filter
  const showPassingStats = !currentPosition || currentPosition === "QB";
  const showRushingStats = !currentPosition || currentPosition === "QB" || currentPosition === "RB";
  const showReceivingStats = !currentPosition || ["RB", "WR", "TE"].includes(currentPosition);
  const showKickingStats = !currentPosition || currentPosition === "K";

  if (players.length === 0) {
    return (
      <div className="bg-[#252830] rounded-xl border border-gray-700 p-8 text-center">
        <p className="text-gray-500">No players found. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-[#1e2128]">
                {/* Player Info */}
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-64">
                  Player
                </th>
                <SortableHeader field="adp" label="ADP" />
                <SortableHeader field="points" label="FPts" />

                {/* Passing Stats */}
                {showPassingStats && (
                  <>
                    <th className="px-2 py-1 text-center text-[9px] font-semibold text-gray-500 uppercase tracking-wider border-l border-gray-700" colSpan={4}>
                      Passing
                    </th>
                  </>
                )}

                {/* Rushing Stats */}
                {showRushingStats && (
                  <>
                    <th className="px-2 py-1 text-center text-[9px] font-semibold text-gray-500 uppercase tracking-wider border-l border-gray-700" colSpan={3}>
                      Rushing
                    </th>
                  </>
                )}

                {/* Receiving Stats */}
                {showReceivingStats && (
                  <>
                    <th className="px-2 py-1 text-center text-[9px] font-semibold text-gray-500 uppercase tracking-wider border-l border-gray-700" colSpan={4}>
                      Receiving
                    </th>
                  </>
                )}

                {/* Kicking Stats */}
                {showKickingStats && (
                  <>
                    <th className="px-2 py-1 text-center text-[9px] font-semibold text-gray-500 uppercase tracking-wider border-l border-gray-700" colSpan={2}>
                      Kicking
                    </th>
                  </>
                )}

                {activeLeagueId && (
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-24">
                    Action
                  </th>
                )}
              </tr>
              {/* Sub-header row with sortable stat columns */}
              <tr className="border-b border-gray-700 bg-[#1a1d24]">
                <th className="px-3 py-1"></th>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1"></th>

                {showPassingStats && (
                  <>
                    <SortableHeader field="passCompletions" label="CMP" className="border-l border-gray-700" />
                    <SortableHeader field="passAttempts" label="ATT" />
                    <SortableHeader field="passYards" label="YDS" />
                    <SortableHeader field="passTds" label="TD" />
                  </>
                )}

                {showRushingStats && (
                  <>
                    <SortableHeader field="rushAttempts" label="ATT" className="border-l border-gray-700" />
                    <SortableHeader field="rushYards" label="YDS" />
                    <SortableHeader field="rushTds" label="TD" />
                  </>
                )}

                {showReceivingStats && (
                  <>
                    <SortableHeader field="targets" label="TGT" className="border-l border-gray-700" />
                    <SortableHeader field="receptions" label="REC" />
                    <SortableHeader field="recYards" label="YDS" />
                    <SortableHeader field="recTds" label="TD" />
                  </>
                )}

                {showKickingStats && (
                  <>
                    <SortableHeader field="fgMade" label="FG" className="border-l border-gray-700" />
                    <SortableHeader field="fgAttempts" label="XP" />
                  </>
                )}

                {activeLeagueId && <th className="px-3 py-1"></th>}
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => {
                const isOwned = ownedSet.has(player.id);
                const posColor = POSITION_COLORS[player.position] || "bg-gray-500/20 text-gray-400";

                return (
                  <tr
                    key={player.id}
                    className={`border-b border-gray-700/50 last:border-b-0 hover:bg-[#2a2e38] transition-colors ${
                      idx % 2 === 0 ? "bg-[#1e2128]" : "bg-[#1a1d24]"
                    }`}
                  >
                    {/* Player Info */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded text-xs font-bold border ${posColor}`}>
                            {player.position}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <PlayerNameLink
                              playerId={player.id}
                              playerName={player.fullName}
                              className="text-sm font-medium text-white hover:text-purple-400 truncate"
                            />
                            {player.injuryStatus && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                player.injuryStatus === "Out"
                                  ? "bg-red-500/20 text-red-400"
                                  : player.injuryStatus === "Questionable"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-orange-500/20 text-orange-400"
                              }`}>
                                {player.injuryStatus === "Questionable" ? "Q" : player.injuryStatus === "Doubtful" ? "D" : "O"}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {player.team || "FA"} · #{player.number || "-"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* ADP */}
                    <td className="px-2 py-2 text-right">
                      <span className="text-sm font-medium text-white tabular-nums">
                        {player.adp ? player.adp.toFixed(1) : "-"}
                      </span>
                    </td>

                    {/* Fantasy Points */}
                    <td className="px-2 py-2 text-right">
                      <span className="text-sm font-semibold text-purple-400 tabular-nums">
                        {player.fantasyPts ? player.fantasyPts.toFixed(1) : "-"}
                      </span>
                    </td>

                    {/* Passing Stats */}
                    {showPassingStats && (
                      <>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums border-l border-gray-700/50">
                          {player.passCompletions || "-"}
                        </td>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums">
                          {player.passAttempts || "-"}
                        </td>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums">
                          {player.passYards || "-"}
                        </td>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums">
                          {player.passTds || "-"}
                        </td>
                      </>
                    )}

                    {/* Rushing Stats */}
                    {showRushingStats && (
                      <>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums border-l border-gray-700/50">
                          {player.rushAttempts || "-"}
                        </td>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums">
                          {player.rushYards || "-"}
                        </td>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums">
                          {player.rushTds || "-"}
                        </td>
                      </>
                    )}

                    {/* Receiving Stats */}
                    {showReceivingStats && (
                      <>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums border-l border-gray-700/50">
                          {player.targets || "-"}
                        </td>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums">
                          {player.receptions || "-"}
                        </td>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums">
                          {player.recYards || "-"}
                        </td>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums">
                          {player.recTds || "-"}
                        </td>
                      </>
                    )}

                    {/* Kicking Stats */}
                    {showKickingStats && (
                      <>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums border-l border-gray-700/50">
                          {player.fgMade ? `${player.fgMade}/${player.fgAttempts}` : "-"}
                        </td>
                        <td className="px-2 py-2 text-right text-sm text-gray-300 tabular-nums">
                          {player.xpMade ? `${player.xpMade}/${player.xpAttempts}` : "-"}
                        </td>
                      </>
                    )}

                    {/* Action */}
                    {activeLeagueId && (
                      <td className="px-3 py-2 text-right">
                        {isOwned ? (
                          <span className="text-xs text-gray-500 font-medium">Rostered</span>
                        ) : (
                          <button
                            onClick={() => handlePickup(player.id)}
                            disabled={isPending && actionPlayerId === player.id}
                            className="px-2.5 py-1 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          >
                            {isPending && actionPlayerId === player.id ? "..." : "Add"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
