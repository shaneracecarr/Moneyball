"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchAvailablePlayersAction } from "@/lib/actions/draft";
import { PlayerNameLink } from "@/components/player-card/player-name-link";

type Player = {
  id: string;
  fullName: string;
  position: string;
  team: string | null;
};

interface PlayerListProps {
  draftId: string;
  isMyTurn: boolean;
  onDraftPlayer: (playerId: string) => void;
  pickingPlayerId: string | null;
  refreshKey: number;
}

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

export function PlayerList({
  draftId,
  isMyTurn,
  onDraftPlayer,
  pickingPlayerId,
  refreshKey,
}: PlayerListProps) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<string | undefined>(undefined);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const result = await searchAvailablePlayersAction(draftId, {
      search: search || undefined,
      position,
      limit: 50,
    });
    if (result.players) {
      setPlayers(result.players as Player[]);
    }
    setLoading(false);
  }, [draftId, search, position]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers, refreshKey]);

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-3 mb-3">
        <Input
          placeholder="Search players..."
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
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {loading && <p className="text-sm text-gray-500 p-2">Loading...</p>}
        {!loading && players.length === 0 && (
          <p className="text-sm text-gray-500 p-2">No players found</p>
        )}
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50"
          >
            <div>
              <PlayerNameLink playerId={player.id} playerName={player.fullName} className="text-sm font-medium" />
              <p className="text-xs text-gray-500">
                {player.position} {player.team ? `- ${player.team}` : ""}
              </p>
            </div>
            {isMyTurn && (
              <Button
                size="sm"
                onClick={() => onDraftPlayer(player.id)}
                disabled={pickingPlayerId === player.id}
              >
                {pickingPlayerId === player.id ? "Drafting..." : "Draft"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
