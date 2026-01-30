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
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Free Agents
      </h3>
      <Input
        placeholder="Search free agents..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex flex-wrap gap-1">
        <Button
          variant={!position ? "default" : "outline"}
          size="sm"
          onClick={() => setPosition(undefined)}
        >
          All
        </Button>
        {POSITIONS.map((pos) => (
          <Button
            key={pos}
            variant={position === pos ? "default" : "outline"}
            size="sm"
            onClick={() => setPosition(pos === position ? undefined : pos)}
          >
            {pos}
          </Button>
        ))}
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {fetching && <p className="text-sm text-gray-500 p-2">Loading...</p>}
        {!fetching && players.length === 0 && (
          <p className="text-sm text-gray-500 p-2">No free agents found</p>
        )}
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 border border-gray-100"
          >
            <div>
              <PlayerNameLink playerId={player.id} playerName={player.fullName} className="text-sm font-medium" />
              <p className="text-xs text-gray-500">
                {player.position} {player.team ? `- ${player.team}` : ""}
              </p>
            </div>
            <div>
              {dropForPlayerId === player.id ? (
                <div className="flex items-center gap-1">
                  <select
                    className="text-xs border rounded px-1.5 py-1 bg-white"
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setDropForPlayerId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  disabled={externalLoading}
                  onClick={() => {
                    if (rosterFull) {
                      setDropForPlayerId(player.id);
                    } else {
                      onPickup(player.id);
                    }
                  }}
                >
                  Pick Up
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
