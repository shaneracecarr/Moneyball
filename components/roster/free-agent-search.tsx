"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { searchFreeAgentsAction } from "@/lib/actions/roster";
import { PlayerNameLink } from "@/components/player-card/player-name-link";
import type { RosterEntry } from "./roster-section";

type Player = {
  id: string;
  fullName: string;
  position: string;
  team: string | null;
  adp: number | null;
  seasonPoints: number | null;
};

interface FreeAgentSearchProps {
  leagueId: string;
  onPickup: (playerId: string) => void;
  onDropAndAdd: (dropRosterPlayerId: string, addPlayerId: string) => void;
  rosterFull: boolean;
  roster: RosterEntry[];
  loading: boolean;
}

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

const POSITION_COLORS: Record<string, string> = {
  QB: "bg-red-500/20 text-red-400 border-red-500/30",
  RB: "bg-green-500/20 text-green-400 border-green-500/30",
  WR: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  TE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  K: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DEF: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

type SortOption = "adp" | "seasonPoints" | "avgPoints";

export function FreeAgentSearch({
  leagueId,
  onPickup,
  onDropAndAdd,
  rosterFull,
  roster,
  loading: externalLoading,
}: FreeAgentSearchProps) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<SortOption>("adp");
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [fetching, setFetching] = useState(false);
  const [dropForPlayerId, setDropForPlayerId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchPlayers = useCallback(async () => {
    setFetching(true);
    const result = await searchFreeAgentsAction(leagueId, {
      search: search || undefined,
      position,
      limit: 50,
      sortBy,
      includeRostered: showAllPlayers,
    });
    if (result.players) {
      setPlayers(result.players as Player[]);
    }
    setFetching(false);
  }, [leagueId, search, position, sortBy, showAllPlayers, refreshTrigger]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Refresh the list after a pickup
  const handlePickup = (playerId: string) => {
    onPickup(playerId);
    // Trigger a refresh after a short delay to allow the server to process
    setTimeout(() => setRefreshTrigger((t) => t + 1), 500);
  };

  const handleDropAndAdd = (dropRosterPlayerId: string, addPlayerId: string) => {
    onDropAndAdd(dropRosterPlayerId, addPlayerId);
    setDropForPlayerId(null);
    // Trigger a refresh after a short delay
    setTimeout(() => setRefreshTrigger((t) => t + 1), 500);
  };

  // Check if a player is on the current roster
  const isRostered = (playerId: string) => {
    return roster.some((r) => r.playerId === playerId);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <Input
        placeholder="Search players..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-[#1a1d24] border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
      />

      {/* Free Agents / All Players Toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => setShowAllPlayers(false)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !showAllPlayers
              ? "bg-purple-600 text-white"
              : "bg-[#1a1d24] text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700"
          }`}
        >
          Free Agents
        </button>
        <button
          onClick={() => setShowAllPlayers(true)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showAllPlayers
              ? "bg-purple-600 text-white"
              : "bg-[#1a1d24] text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700"
          }`}
        >
          All Players
        </button>
      </div>

      {/* Position Filters */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setPosition(undefined)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !position
              ? "bg-purple-600 text-white"
              : "bg-[#1a1d24] text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700"
          }`}
        >
          All
        </button>
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => setPosition(pos === position ? undefined : pos)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              position === pos
                ? "bg-purple-600 text-white"
                : "bg-[#1a1d24] text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700"
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Sort:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="flex-1 bg-[#1a1d24] border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          <option value="adp">ADP (Draft Rank)</option>
          <option value="seasonPoints">Season Points</option>
          <option value="avgPoints">Avg Pts/Week</option>
        </select>
      </div>

      {/* Player List */}
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {fetching && <p className="text-sm text-gray-400 p-2">Loading...</p>}
        {!fetching && players.length === 0 && (
          <p className="text-sm text-gray-400 p-2">No players found</p>
        )}
        {players.map((player) => {
          const posColor = POSITION_COLORS[player.position] || "bg-gray-500/20 text-gray-400";
          const owned = isRostered(player.id);

          // Calculate display values
          const avgPts = player.seasonPoints ? (player.seasonPoints / 17).toFixed(1) : "—";
          const seasonPts = player.seasonPoints?.toFixed(1) || "—";
          const adpDisplay = player.adp?.toFixed(0) || "—";

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between py-2 px-3 rounded-lg border border-gray-700/50 ${
                owned ? "bg-[#1e2128] opacity-60" : "bg-[#1a1d24] hover:bg-[#1e2128]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${posColor}`}>
                  {player.position}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <PlayerNameLink
                      playerId={player.id}
                      playerName={player.fullName}
                      className="text-sm font-medium text-white hover:text-purple-400 truncate"
                    />
                    {owned && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 shrink-0">
                        Rostered
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{player.team || "FA"}</span>
                    <span className="text-gray-600">|</span>
                    <span>ADP: {adpDisplay}</span>
                    <span className="text-gray-600">|</span>
                    <span>{avgPts} avg</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 ml-2">
                {owned ? (
                  <span className="text-xs text-gray-500">Owned</span>
                ) : dropForPlayerId === player.id ? (
                  <div className="flex items-center gap-1">
                    <select
                      className="text-xs border border-gray-700 rounded px-1.5 py-1 bg-[#1a1d24] text-white max-w-[100px]"
                      defaultValue=""
                      disabled={externalLoading}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleDropAndAdd(e.target.value, player.id);
                        }
                      }}
                    >
                      <option value="" disabled>
                        Drop?
                      </option>
                      {roster.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.playerName.split(" ").pop()} ({r.slot})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setDropForPlayerId(null)}
                      className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={externalLoading}
                    onClick={() => {
                      if (rosterFull) {
                        setDropForPlayerId(player.id);
                      } else {
                        handlePickup(player.id);
                      }
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
