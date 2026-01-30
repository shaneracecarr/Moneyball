"use client";

import { PlayerNameLink } from "@/components/player-card/player-name-link";

const POSITION_COLORS: Record<string, string> = {
  QB: "bg-red-500",
  RB: "bg-green-500",
  WR: "bg-blue-500",
  TE: "bg-orange-500",
  K: "bg-purple-500",
  DEF: "bg-slate-500",
};

interface MatchupPlayerRowProps {
  slot: string;
  playerName: string | null;
  playerPosition: string | null;
  playerTeam: string | null;
  playerId: string | null;
  side: "left" | "right";
}

export function MatchupPlayerRow({
  slot,
  playerName,
  playerPosition,
  playerTeam,
  playerId,
  side,
}: MatchupPlayerRowProps) {
  const posColor = playerPosition ? POSITION_COLORS[playerPosition] || "bg-gray-400" : "bg-gray-300";
  const displaySlot = slot.replace(/\d+$/, "").replace("BN", "BN").replace("IR", "IR");

  const content = (
    <>
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded text-xs font-bold text-white ${posColor}`}
      >
        {playerPosition || displaySlot}
      </span>
      <div className={`flex-1 min-w-0 ${side === "right" ? "text-right" : "text-left"}`}>
        {playerName ? (
          <>
            <p className="text-sm font-medium text-gray-900 truncate">
              {playerId ? (
                <PlayerNameLink playerId={playerId} playerName={playerName} />
              ) : (
                playerName
              )}
            </p>
            <p className="text-xs text-gray-500">{playerTeam || "FA"}</p>
          </>
        ) : (
          <p className="text-sm text-gray-400 italic">Empty</p>
        )}
      </div>
      <span className="text-sm font-semibold text-gray-600 tabular-nums w-10 text-right">0.0</span>
    </>
  );

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 ${
        side === "right" ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {content}
    </div>
  );
}
