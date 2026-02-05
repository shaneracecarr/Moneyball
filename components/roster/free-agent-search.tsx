"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchFreeAgentsAction } from "@/lib/actions/roster";
import { PlayerNameLink } from "@/components/player-card/player-name-link";
import type { RosterEntry } from "./roster-section";

type Player = {
  id: string;
  fullName: string;
  position: string;
  team: string | null;
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [fetching, setFetching] = useState(false);
  const [dropForPlayerId, setDropForPlayerId] = useState<string | null>(null);

  const fetchPlayers = useCallback(async () => {
    setFetching(true);
    const result = await searchFreeAgentsAction(leagueId, {
      search: search || undefined,
      position,
      limit: 50,
    });
    if (result.players) {
      setPlayers(result.players as Player[]);
    }
    setFetching(false);
  }, [leagueId, search, position]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search free agents..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-[#1a1d24] border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
      />
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

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {fetching && <p className="text-sm text-gray-400 p-2">Loading...</p>}
        {!fetching && players.length === 0 && (
          <p className="text-sm text-gray-400 p-2">No free agents found</p>
        )}
        {players.map((player) => {
          const posColor = POSITION_COLORS[player.position] || "bg-gray-500/20 text-gray-400";

          return (
            <div
              key={player.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1e2128] border border-gray-700/50 bg-[#1a1d24]"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${posColor}`}>
                  {player.position}
                </span>
                <div>
                  <PlayerNameLink
                    playerId={player.id}
                    playerName={player.fullName}
                    className="text-sm font-medium text-white hover:text-purple-400"
                  />
                  <p className="text-xs text-gray-400">
                    {player.team || "FA"}
                  </p>
                </div>
              </div>
              <div>
                {dropForPlayerId === player.id ? (
                  <div className="flex items-center gap-1">
                    <select
                      className="text-xs border border-gray-700 rounded px-1.5 py-1 bg-[#1a1d24] text-white"
                      defaultValue=""
                      disabled={externalLoading}
                      onChange={(e) => {
                        if (e.target.value) {
                          onDropAndAdd(e.target.value, player.id);
                          setDropForPlayerId(null);
                        }
                      }}
                    >
                      <option value="" disabled>
                        Drop who?
                      </option>
                      {roster.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.playerName} ({r.slot})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setDropForPlayerId(null)}
                      className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={externalLoading}
                    onClick={() => {
                      if (rosterFull) {
                        setDropForPlayerId(player.id);
                      } else {
                        onPickup(player.id);
                      }
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Pick Up
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
