"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const POSITION_COLORS: Record<string, string> = {
  QB: "bg-red-500",
  RB: "bg-green-500",
  WR: "bg-blue-500",
  TE: "bg-orange-500",
  K: "bg-purple-500",
  DEF: "bg-slate-600",
};

const POSITION_BORDER_COLORS: Record<string, string> = {
  QB: "border-red-500",
  RB: "border-green-500",
  WR: "border-blue-500",
  TE: "border-orange-500",
  K: "border-purple-500",
  DEF: "border-slate-600",
};

type GameStat = {
  gameId: string;
  season: number;
  week: number;
  opponent: string | null;
  isHome: boolean | null;
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
  fgAttempted: number | null;
  xpMade: number | null;
  xpAttempted: number | null;
  fantasyPointsStandard: number | null;
  fantasyPointsPpr: number | null;
  fantasyPointsHalfPpr: number | null;
};

export type PlayerCardData = {
  player: {
    id: string;
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
    height?: string | null;
    weight?: string | null;
    college?: string | null;
    headshotUrl?: string | null;
    seasonPoints?: number | null;
    adp?: number | null;
  };
  gameStats: GameStat[];
  ownerTeamName: string | null;
  isOwnedByCurrentUser: boolean;
  rosterPlayerId: string | null;
  activeLeagueId: string | null;
};

interface PlayerCardModalProps {
  data: PlayerCardData;
  onClose: () => void;
  onDrop: () => void;
  dropping: boolean;
}

function StatValue({ value, fallback = "X" }: { value: number | string | null | undefined; fallback?: string }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-500">{fallback}</span>;
  }
  return <>{value}</>;
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function PlayerCardModal({ data, onClose, onDrop, dropping }: PlayerCardModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { player, gameStats, ownerTeamName, isOwnedByCurrentUser } = data;

  // Get unique seasons from game stats
  const seasons = Array.from(new Set(gameStats.map((g) => g.season))).sort((a, b) => b - a);
  const [selectedSeason, setSelectedSeason] = useState(seasons[0] || 2024);

  // Filter stats by selected season
  const seasonStats = gameStats
    .filter((g) => g.season === selectedSeason)
    .sort((a, b) => a.week - b.week);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  const posColor = POSITION_COLORS[player.position] || "bg-gray-500";
  const posBorderColor = POSITION_BORDER_COLORS[player.position] || "border-gray-500";

  // Calculate season totals
  const seasonTotals = seasonStats.reduce(
    (acc, g) => ({
      passYards: acc.passYards + (g.passYards || 0),
      passTds: acc.passTds + (g.passTds || 0),
      passInts: acc.passInts + (g.passInts || 0),
      rushYards: acc.rushYards + (g.rushYards || 0),
      rushTds: acc.rushTds + (g.rushTds || 0),
      recYards: acc.recYards + (g.recYards || 0),
      recTds: acc.recTds + (g.recTds || 0),
      receptions: acc.receptions + (g.receptions || 0),
      fgMade: acc.fgMade + (g.fgMade || 0),
      fgAttempted: acc.fgAttempted + (g.fgAttempted || 0),
      fantasyPts: acc.fantasyPts + (g.fantasyPointsHalfPpr || 0),
    }),
    { passYards: 0, passTds: 0, passInts: 0, rushYards: 0, rushTds: 0, recYards: 0, recTds: 0, receptions: 0, fgMade: 0, fgAttempted: 0, fantasyPts: 0 }
  );

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleOverlayClick}
    >
      <div className="bg-[#1a1d24] rounded-xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header Section - Dark with player info */}
        <div className="bg-[#252830] px-6 py-5">
          <div className="flex items-start gap-5">
            {/* Large Player Portrait */}
            <div className={`relative shrink-0 rounded-xl overflow-hidden border-2 ${posBorderColor}`}>
              {player.headshotUrl ? (
                <img
                  src={player.headshotUrl}
                  alt={player.fullName}
                  className="w-28 h-28 object-cover bg-gray-800"
                />
              ) : (
                <div className={`w-28 h-28 flex items-center justify-center ${posColor} text-white text-2xl font-bold`}>
                  {player.position}
                </div>
              )}
              {/* Position badge */}
              <div className={`absolute bottom-0 left-0 right-0 ${posColor} text-white text-xs font-bold py-1 text-center`}>
                {player.position} {player.team && `• ${player.team}`} {player.number && `#${player.number}`}
              </div>
            </div>

            {/* Player Name & Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white truncate">{player.fullName}</h2>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {player.team || "Free Agent"}
                    {player.number && ` • #${player.number}`}
                  </p>
                </div>
                {/* Injury Status Badge */}
                {player.injuryStatus && (
                  <span className="shrink-0 px-3 py-1 rounded-full text-sm font-semibold bg-orange-500 text-white">
                    {player.injuryStatus}
                  </span>
                )}
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="shrink-0 text-gray-400 hover:text-white text-2xl leading-none p-1 -mt-1 -mr-1"
                >
                  &times;
                </button>
              </div>

              {/* Info Row */}
              <div className="flex items-center gap-6 mt-4 bg-[#1a1d24] rounded-lg px-4 py-3">
                <InfoBox label="Age" value={<StatValue value={player.age} />} />
                <div className="w-px h-8 bg-gray-700" />
                <InfoBox label="Height" value={<StatValue value={player.height} />} />
                <div className="w-px h-8 bg-gray-700" />
                <InfoBox label="Weight" value={player.weight ? `${player.weight}` : <StatValue value={null} />} />
                <div className="w-px h-8 bg-gray-700" />
                <InfoBox label="Exp" value={player.yearsExp !== null ? `${player.yearsExp} yr` : <StatValue value={null} />} />
                <div className="w-px h-8 bg-gray-700" />
                <InfoBox label="College" value={<StatValue value={player.college} />} />
                <div className="w-px h-8 bg-gray-700" />
                <InfoBox label="ADP" value={player.adp ? player.adp.toFixed(1) : <StatValue value={null} />} />
              </div>
            </div>
          </div>

          {/* Season Fantasy Points & Owner */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-400 text-sm">Season Fantasy Pts (Half PPR)</span>
                <span className="ml-2 text-xl font-bold text-green-400">{seasonTotals.fantasyPts.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Owner:</span>
              {ownerTeamName ? (
                <span className="text-sm font-medium text-indigo-400 bg-indigo-500/20 px-2 py-1 rounded">
                  {ownerTeamName}
                </span>
              ) : (
                <span className="text-sm font-medium text-green-400 bg-green-500/20 px-2 py-1 rounded">
                  Free Agent
                </span>
              )}
              {isOwnedByCurrentUser && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 text-red-400 border-red-400/50 hover:bg-red-500/20 hover:text-red-300"
                  onClick={onDrop}
                  disabled={dropping}
                >
                  {dropping ? "Dropping..." : "Drop"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Game Logs Section */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Season Tabs */}
          <div className="flex items-center gap-2 px-6 py-3 bg-[#1e2128] border-b border-gray-700">
            <span className="text-gray-400 text-sm font-medium mr-2">GAME LOGS</span>
            {seasons.map((season) => (
              <button
                key={season}
                onClick={() => setSelectedSeason(season)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedSeason === season
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {season}
              </button>
            ))}
          </div>

          {/* Stats Table */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {seasonStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No game data available for {selectedSeason}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-gray-400 text-xs uppercase sticky top-0 bg-[#1a1d24]">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium">WK</th>
                    <th className="text-left py-2 px-2 font-medium">OPP</th>
                    <th className="text-right py-2 px-2 font-medium text-green-400">FPTS</th>
                    {/* Position-specific columns */}
                    {(player.position === "QB" || player.position === "RB" || player.position === "WR" || player.position === "TE") && (
                      <>
                        {player.position === "QB" && (
                          <>
                            <th className="text-right py-2 px-2 font-medium">CMP</th>
                            <th className="text-right py-2 px-2 font-medium">ATT</th>
                            <th className="text-right py-2 px-2 font-medium">YDS</th>
                            <th className="text-right py-2 px-2 font-medium">TD</th>
                            <th className="text-right py-2 px-2 font-medium">INT</th>
                          </>
                        )}
                        {(player.position === "RB" || player.position === "QB") && (
                          <>
                            <th className="text-right py-2 px-2 font-medium">CAR</th>
                            <th className="text-right py-2 px-2 font-medium">RuYD</th>
                            <th className="text-right py-2 px-2 font-medium">RuTD</th>
                          </>
                        )}
                        {(player.position === "WR" || player.position === "TE" || player.position === "RB") && (
                          <>
                            <th className="text-right py-2 px-2 font-medium">TGT</th>
                            <th className="text-right py-2 px-2 font-medium">REC</th>
                            <th className="text-right py-2 px-2 font-medium">ReYD</th>
                            <th className="text-right py-2 px-2 font-medium">ReTD</th>
                          </>
                        )}
                      </>
                    )}
                    {player.position === "K" && (
                      <>
                        <th className="text-right py-2 px-2 font-medium">FGM</th>
                        <th className="text-right py-2 px-2 font-medium">FGA</th>
                        <th className="text-right py-2 px-2 font-medium">XPM</th>
                        <th className="text-right py-2 px-2 font-medium">XPA</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="text-white">
                  {seasonStats.map((game, idx) => (
                    <tr key={game.gameId} className={idx % 2 === 0 ? "bg-[#1e2128]" : "bg-[#1a1d24]"}>
                      <td className="py-2 px-2 text-gray-300">{game.week}</td>
                      <td className="py-2 px-2">
                        <span className="text-gray-400">{game.isHome ? "vs" : "@"}</span>{" "}
                        <StatValue value={game.opponent} />
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-green-400">
                        {game.fantasyPointsHalfPpr?.toFixed(1) || <StatValue value={null} />}
                      </td>
                      {/* Position-specific data */}
                      {(player.position === "QB" || player.position === "RB" || player.position === "WR" || player.position === "TE") && (
                        <>
                          {player.position === "QB" && (
                            <>
                              <td className="py-2 px-2 text-right"><StatValue value={game.passCompletions} /></td>
                              <td className="py-2 px-2 text-right"><StatValue value={game.passAttempts} /></td>
                              <td className="py-2 px-2 text-right"><StatValue value={game.passYards} /></td>
                              <td className="py-2 px-2 text-right"><StatValue value={game.passTds} /></td>
                              <td className="py-2 px-2 text-right"><StatValue value={game.passInts} /></td>
                            </>
                          )}
                          {(player.position === "RB" || player.position === "QB") && (
                            <>
                              <td className="py-2 px-2 text-right"><StatValue value={game.rushAttempts} /></td>
                              <td className="py-2 px-2 text-right"><StatValue value={game.rushYards} /></td>
                              <td className="py-2 px-2 text-right"><StatValue value={game.rushTds} /></td>
                            </>
                          )}
                          {(player.position === "WR" || player.position === "TE" || player.position === "RB") && (
                            <>
                              <td className="py-2 px-2 text-right"><StatValue value={game.targets} /></td>
                              <td className="py-2 px-2 text-right"><StatValue value={game.receptions} /></td>
                              <td className="py-2 px-2 text-right"><StatValue value={game.recYards} /></td>
                              <td className="py-2 px-2 text-right"><StatValue value={game.recTds} /></td>
                            </>
                          )}
                        </>
                      )}
                      {player.position === "K" && (
                        <>
                          <td className="py-2 px-2 text-right"><StatValue value={game.fgMade} /></td>
                          <td className="py-2 px-2 text-right"><StatValue value={game.fgAttempted} /></td>
                          <td className="py-2 px-2 text-right"><StatValue value={game.xpMade} /></td>
                          <td className="py-2 px-2 text-right"><StatValue value={game.xpAttempted} /></td>
                        </>
                      )}
                    </tr>
                  ))}
                  {/* Season Totals Row */}
                  <tr className="border-t border-gray-600 bg-[#252830] font-semibold">
                    <td className="py-2 px-2 text-gray-300">TOT</td>
                    <td className="py-2 px-2 text-gray-400">{seasonStats.length} games</td>
                    <td className="py-2 px-2 text-right text-green-400">{seasonTotals.fantasyPts.toFixed(1)}</td>
                    {player.position === "QB" && (
                      <>
                        <td className="py-2 px-2 text-right">-</td>
                        <td className="py-2 px-2 text-right">-</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.passYards}</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.passTds}</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.passInts}</td>
                        <td className="py-2 px-2 text-right">-</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.rushYards}</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.rushTds}</td>
                      </>
                    )}
                    {player.position === "RB" && (
                      <>
                        <td className="py-2 px-2 text-right">-</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.rushYards}</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.rushTds}</td>
                        <td className="py-2 px-2 text-right">-</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.receptions}</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.recYards}</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.recTds}</td>
                      </>
                    )}
                    {(player.position === "WR" || player.position === "TE") && (
                      <>
                        <td className="py-2 px-2 text-right">-</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.receptions}</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.recYards}</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.recTds}</td>
                      </>
                    )}
                    {player.position === "K" && (
                      <>
                        <td className="py-2 px-2 text-right">{seasonTotals.fgMade}</td>
                        <td className="py-2 px-2 text-right">{seasonTotals.fgAttempted}</td>
                        <td className="py-2 px-2 text-right">-</td>
                        <td className="py-2 px-2 text-right">-</td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
