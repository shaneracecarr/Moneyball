"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

const POSITION_COLORS: Record<string, string> = {
  QB: "bg-red-500",
  RB: "bg-green-500",
  WR: "bg-blue-500",
  TE: "bg-orange-500",
  K: "bg-purple-500",
  DEF: "bg-slate-500",
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
    rawStats?: string | null;
  };
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

type ParsedStats = {
  stats?: {
    Passing?: Record<string, string>;
    Rushing?: Record<string, string>;
    Receiving?: Record<string, string>;
    Defense?: Record<string, string>;
    Kicking?: Record<string, string>;
    gamesPlayed?: string;
  };
  wins?: string;
  loss?: string;
  pa?: string;
  pf?: string;
};

function parseRawStats(rawStats: string | null | undefined): ParsedStats | null {
  if (!rawStats) return null;
  try {
    return JSON.parse(rawStats);
  } catch {
    return null;
  }
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function StatsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        {title}
      </h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function PlayerSeasonStats({ position, parsed }: { position: string; parsed: ParsedStats }) {
  const s = parsed.stats;
  if (!s) return null;

  if (position === "DEF") {
    const def = s.Defense;
    if (!def) return null;
    return (
      <div className="space-y-3">
        <StatsSection title="Defense">
          {def.sacks && <StatRow label="Sacks" value={def.sacks} />}
          {def.defensiveInterceptions && (
            <StatRow label="INTs" value={def.defensiveInterceptions} />
          )}
          {def.fumblesRecovered && (
            <StatRow label="Fumbles Rec" value={def.fumblesRecovered} />
          )}
          {def.defTD && <StatRow label="Def TDs" value={def.defTD} />}
          {def.totalTackles && (
            <StatRow label="Total Tackles" value={def.totalTackles} />
          )}
          {def.passDeflections && (
            <StatRow label="Pass Deflections" value={def.passDeflections} />
          )}
          {def.passingYardsAllowed && (
            <StatRow label="Pass Yds Allowed" value={def.passingYardsAllowed} />
          )}
          {def.rushingYardsAllowed && (
            <StatRow label="Rush Yds Allowed" value={def.rushingYardsAllowed} />
          )}
        </StatsSection>
        {(parsed.wins || parsed.loss) && (
          <StatsSection title="Record">
            <StatRow
              label="W-L"
              value={`${parsed.wins || 0}-${parsed.loss || 0}`}
            />
            {parsed.pf && <StatRow label="Points For" value={parsed.pf} />}
            {parsed.pa && <StatRow label="Points Against" value={parsed.pa} />}
          </StatsSection>
        )}
      </div>
    );
  }

  const passing = s.Passing;
  const rushing = s.Rushing;
  const receiving = s.Receiving;
  const kicking = s.Kicking;
  const gp = s.gamesPlayed;

  const hasAnyStats = passing || rushing || receiving || kicking;
  if (!hasAnyStats) return null;

  return (
    <div className="space-y-3">
      {gp && <StatRow label="Games Played" value={gp} />}

      {passing &&
        (parseFloat(passing.passAttempts) || 0) > 0 && (
          <StatsSection title="Passing">
            <StatRow
              label="Comp/Att"
              value={`${passing.passCompletions || 0}/${passing.passAttempts || 0}`}
            />
            <StatRow label="Yards" value={passing.passYds || "0"} />
            <StatRow label="TDs" value={passing.passTD || "0"} />
            <StatRow label="INTs" value={passing.int || "0"} />
          </StatsSection>
        )}

      {rushing &&
        (parseFloat(rushing.carries) || 0) > 0 && (
          <StatsSection title="Rushing">
            <StatRow label="Carries" value={rushing.carries || "0"} />
            <StatRow label="Yards" value={rushing.rushYds || "0"} />
            <StatRow label="TDs" value={rushing.rushTD || "0"} />
          </StatsSection>
        )}

      {receiving &&
        (parseFloat(receiving.receptions) || 0) > 0 && (
          <StatsSection title="Receiving">
            <StatRow
              label="Rec/Tgt"
              value={`${receiving.receptions || 0}/${receiving.targets || 0}`}
            />
            <StatRow label="Yards" value={receiving.recYds || "0"} />
            <StatRow label="TDs" value={receiving.recTD || "0"} />
          </StatsSection>
        )}

      {kicking &&
        (parseFloat(kicking.fgAttempts) || 0) > 0 && (
          <StatsSection title="Kicking">
            <StatRow
              label="FG"
              value={`${kicking.fgMade || 0}/${kicking.fgAttempts || 0}`}
            />
            <StatRow
              label="XP"
              value={`${kicking.xpMade || 0}/${kicking.xpAttempts || 0}`}
            />
          </StatsSection>
        )}
    </div>
  );
}

export function PlayerCardModal({ data, onClose, onDrop, dropping }: PlayerCardModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

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

  const { player, ownerTeamName, isOwnedByCurrentUser } = data;
  const posColor = POSITION_COLORS[player.position] || "bg-gray-400";
  const parsed = parseRawStats(player.rawStats);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            {player.headshotUrl ? (
              <img
                src={player.headshotUrl}
                alt={player.fullName}
                className="w-12 h-12 rounded-lg object-cover bg-gray-100"
              />
            ) : (
              <span
                className={`inline-flex items-center justify-center w-12 h-12 rounded-lg text-sm font-bold text-white ${posColor}`}
              >
                {player.position}
              </span>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">{player.fullName}</h2>
              <p className="text-sm text-gray-500">
                {player.team || "Free Agent"}
                {player.number !== null ? ` #${player.number}` : ""}
                {" "}
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold text-white ${posColor}`}>
                  {player.position}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Scrollable content */}
        <div className="px-5 pb-4 space-y-3 overflow-y-auto">
          {/* Info grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {player.position !== "DEF" ? (
              <>
                <div className="bg-gray-50 rounded-lg py-2">
                  <p className="text-xs text-gray-500">Age</p>
                  <p className="text-sm font-semibold">{player.age ?? "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg py-2">
                  <p className="text-xs text-gray-500">Exp</p>
                  <p className="text-sm font-semibold">
                    {player.yearsExp !== null ? `${player.yearsExp} yr` : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg py-2">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-semibold">
                    {player.injuryStatus ? (
                      <span className="text-red-600">{player.injuryStatus}</span>
                    ) : player.status ? (
                      player.status
                    ) : (
                      "Active"
                    )}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gray-50 rounded-lg py-2">
                  <p className="text-xs text-gray-500">Team</p>
                  <p className="text-sm font-semibold">{player.team || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg py-2 col-span-2">
                  <p className="text-xs text-gray-500">Fantasy Pts</p>
                  <p className="text-sm font-semibold">
                    {player.seasonPoints != null ? player.seasonPoints.toFixed(1) : "—"}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Extra bio info for non-DEF */}
          {player.position !== "DEF" && (player.height || player.weight || player.college) && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-lg py-2">
                <p className="text-xs text-gray-500">Height</p>
                <p className="text-sm font-semibold">{player.height || "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg py-2">
                <p className="text-xs text-gray-500">Weight</p>
                <p className="text-sm font-semibold">
                  {player.weight ? `${player.weight} lbs` : "—"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg py-2">
                <p className="text-xs text-gray-500">College</p>
                <p className="text-sm font-semibold truncate" title={player.college || undefined}>
                  {player.college || "—"}
                </p>
              </div>
            </div>
          )}

          {/* Season fantasy points for non-DEF */}
          {player.position !== "DEF" && player.seasonPoints != null && (
            <div className="bg-indigo-50 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-sm text-indigo-700 font-medium">Season Fantasy Pts</span>
              <span className="text-lg font-bold text-indigo-900">
                {player.seasonPoints.toFixed(1)}
              </span>
            </div>
          )}

          {/* Season stats */}
          {parsed && (
            <div className="border-t pt-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Season Stats
              </h3>
              <PlayerSeasonStats position={player.position} parsed={parsed} />
            </div>
          )}

          {/* Owner */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Fantasy Owner:</span>
            {ownerTeamName ? (
              <span className="text-sm font-medium text-gray-900 bg-indigo-50 px-2 py-0.5 rounded">
                {ownerTeamName}
              </span>
            ) : (
              <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
                Free Agent
              </span>
            )}
          </div>

          {/* Drop button */}
          {isOwnedByCurrentUser && (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={onDrop}
              disabled={dropping}
            >
              {dropping ? "Dropping..." : "Drop Player"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
