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
  hasPlayed?: boolean;
}

export function MatchupPlayerRow({
  slot,
  playerName,
  playerPosition,
  playerTeam,
  playerId,
  side,
  hasPlayed = false,
}: MatchupPlayerRowProps) {
  const posColor = playerPosition ? POSITION_COLORS[playerPosition] || "bg-gray-500" : "bg-gray-600";

  // Placeholder projected points
  const projectedPoints = playerName ? "11.0" : "—";
  // Placeholder actual points (if played)
  const actualPoints = hasPlayed && playerName ? "12.4" : null;

  const content = (
    <>
      {/* Position Badge */}
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded text-xs font-bold text-white shrink-0 ${posColor}`}
      >
        {playerPosition || "—"}
      </span>

      {/* Player Info */}
      <div className={`flex-1 min-w-0 ${side === "right" ? "text-right" : "text-left"}`}>
        {playerName ? (
          <>
            <p className="text-sm font-medium text-white truncate">
              {playerId ? (
                <PlayerNameLink
                  playerId={playerId}
                  playerName={playerName}
                  className="hover:text-purple-400 transition-colors"
                />
              ) : (
                playerName
              )}
            </p>
            <p className="text-xs text-gray-500">{playerTeam || "FA"}</p>
          </>
        ) : (
          <p className="text-sm text-gray-600 italic">Empty</p>
        )}
      </div>

      {/* Points Display */}
      <div className={`shrink-0 ${side === "right" ? "text-left" : "text-right"} min-w-[50px]`}>
        {playerName ? (
          <>
            <p className={`text-sm font-semibold tabular-nums ${hasPlayed ? "text-white" : "text-gray-400"}`}>
              {actualPoints || projectedPoints}
            </p>
            {!hasPlayed && (
              <p className="text-[10px] text-gray-600">proj</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-600">—</p>
        )}
      </div>
    </>
  );

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 bg-[#1e2128] ${
        side === "right" ? "flex-row-reverse" : "flex-row"
      } ${hasPlayed ? "opacity-100" : "opacity-80"}`}
    >
      {content}
    </div>
  );
}
