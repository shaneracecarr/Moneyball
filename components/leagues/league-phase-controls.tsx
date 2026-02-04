"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startWeekAction, advanceWeekAction } from "@/lib/actions/league-phase";

interface LeaguePhaseDisplayProps {
  phase: string;
  currentWeek: number;
  leagueId?: string;
  isCommissioner?: boolean;
  isMock?: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  setup: "Setup",
  drafting: "Drafting",
  pre_week: "Pre-Week",
  week_active: "Week In Progress",
  complete: "Season Complete",
};

const PHASE_COLORS: Record<string, string> = {
  setup: "bg-gray-100 text-gray-700",
  drafting: "bg-amber-100 text-amber-800",
  pre_week: "bg-green-100 text-green-800",
  week_active: "bg-blue-100 text-blue-800",
  complete: "bg-indigo-100 text-indigo-800",
};

export function LeaguePhaseControls({
  phase,
  currentWeek,
  leagueId,
  isCommissioner = false,
  isMock = false,
}: LeaguePhaseDisplayProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<{
    team1Name: string;
    team2Name: string;
    team1Score: number;
    team2Score: number;
  }[] | null>(null);

  const phaseLabel = PHASE_LABELS[phase] || phase;
  const phaseColor = PHASE_COLORS[phase] || "bg-gray-100 text-gray-700";

  const handleStartWeek = () => {
    if (!leagueId) return;
    setError(null);
    setLastResults(null);
    startTransition(async () => {
      const result = await startWeekAction(leagueId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleAdvanceWeek = () => {
    if (!leagueId) return;
    setError(null);
    startTransition(async () => {
      const result = await advanceWeekAction(leagueId);
      if (result.error) {
        setError(result.error);
      } else {
        if (result.results) {
          setLastResults(result.results);
        }
        router.refresh();
      }
    });
  };

  const showCommissionerControls = isCommissioner && leagueId && (phase === "pre_week" || phase === "week_active");

  return (
    <div className="space-y-4">
      {/* Mock League Badge */}
      {isMock && (
        <div className="inline-flex items-center rounded-md bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800 ring-1 ring-inset ring-purple-700/10">
          Mock League
        </div>
      )}

      {/* Phase & Week Badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-current/10 ${phaseColor}`}
        >
          {phaseLabel}
        </span>
        {currentWeek >= 1 && currentWeek <= 17 && (
          <span className="text-lg font-bold text-gray-900">Week {currentWeek}</span>
        )}
        {phase === "complete" && (
          <span className="text-lg font-bold text-gray-900">Final Standings</span>
        )}
      </div>

      {/* Status text for users */}
      {phase === "pre_week" && !isCommissioner && (
        <p className="text-sm text-gray-500">
          Week {currentWeek} has not started yet.{" "}
          {isMock
            ? "The commissioner can start the week when ready."
            : "The site admin will start the week when it begins."}
        </p>
      )}
      {phase === "week_active" && !isCommissioner && (
        <p className="text-sm text-gray-500">
          Week {currentWeek} is in progress.{" "}
          {isMock
            ? "The commissioner can advance to the next week when ready."
            : "Matchups will be scored when the week ends."}
        </p>
      )}
      {phase === "complete" && (
        <p className="text-sm text-gray-500">
          The regular season has ended. View the final standings above.
        </p>
      )}

      {/* Commissioner Controls */}
      {showCommissionerControls && (
        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Commissioner Controls
            {isMock && <span className="text-purple-600 ml-2">(Mock League)</span>}
          </p>

          {phase === "pre_week" && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Start Week {currentWeek} to lock lineups and begin the matchup period.
              </p>
              <Button
                onClick={handleStartWeek}
                disabled={isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPending ? "Starting..." : `Start Week ${currentWeek}`}
              </Button>
            </div>
          )}

          {phase === "week_active" && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Advance to score Week {currentWeek} matchups and move to Week {currentWeek + 1 <= 17 ? currentWeek + 1 : "End of Season"}.
                {isMock && " Random stats will be generated for all rostered players."}
              </p>
              <Button
                onClick={handleAdvanceWeek}
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isPending
                  ? "Advancing..."
                  : currentWeek >= 17
                    ? "End Season & Score Week 17"
                    : `Score Week ${currentWeek} & Advance`}
              </Button>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Last Week Results */}
      {lastResults && lastResults.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Week {currentWeek - 1} Results:
          </p>
          <div className="space-y-1">
            {lastResults.map((r, i) => (
              <div key={i} className="text-sm text-gray-600">
                {r.team1Name} ({r.team1Score.toFixed(1)}) vs {r.team2Name} ({r.team2Score.toFixed(1)})
                {r.team1Score > r.team2Score && <span className="text-green-600 ml-2">W</span>}
                {r.team1Score < r.team2Score && <span className="text-red-600 ml-2">L</span>}
                {r.team1Score === r.team2Score && <span className="text-yellow-600 ml-2">T</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
