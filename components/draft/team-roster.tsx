"use client";

import { useState } from "react";
import { PlayerNameLink } from "@/components/player-card/player-name-link";

type Pick = {
  pickNumber: number;
  round: number;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
  playerId: string;
};

interface TeamRosterProps {
  teamName: string;
  picks: Pick[];
  isOnTheClock: boolean;
  isCurrentUser: boolean;
}

export function TeamRoster({ teamName, picks, isOnTheClock, isCurrentUser }: TeamRosterProps) {
  const [expanded, setExpanded] = useState(isOnTheClock || isCurrentUser);

  return (
    <div
      className={`rounded-lg border ${
        isOnTheClock
          ? "border-indigo-400 bg-indigo-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <button
        className="w-full flex items-center justify-between p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{teamName}</span>
          {isOnTheClock && (
            <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
              On the clock
            </span>
          )}
          {isCurrentUser && !isOnTheClock && (
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
              You
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {picks.length} pick{picks.length !== 1 ? "s" : ""} {expanded ? "▲" : "▼"}
        </span>
      </button>
      {expanded && picks.length > 0 && (
        <div className="px-3 pb-3 space-y-1">
          {picks.map((pick) => (
            <div key={pick.pickNumber} className="flex items-center gap-2 text-xs py-1">
              <span className="text-gray-400 w-12">R{pick.round} #{pick.pickNumber}</span>
              <PlayerNameLink playerId={pick.playerId} playerName={pick.playerName} className="font-medium" />
              <span className="text-gray-500">{pick.playerPosition}</span>
              {pick.playerTeam && <span className="text-gray-400">{pick.playerTeam}</span>}
            </div>
          ))}
        </div>
      )}
      {expanded && picks.length === 0 && (
        <p className="px-3 pb-3 text-xs text-gray-400">No picks yet</p>
      )}
    </div>
  );
}
