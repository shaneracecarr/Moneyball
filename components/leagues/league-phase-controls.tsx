"use client";

interface LeaguePhaseDisplayProps {
  phase: string;
  currentWeek: number;
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
}: LeaguePhaseDisplayProps) {
  const phaseLabel = PHASE_LABELS[phase] || phase;
  const phaseColor = PHASE_COLORS[phase] || "bg-gray-100 text-gray-700";

  return (
    <div className="space-y-4">
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
      {phase === "pre_week" && (
        <p className="text-sm text-gray-500">
          Week {currentWeek} has not started yet. The site admin will start the week when it begins.
        </p>
      )}
      {phase === "week_active" && (
        <p className="text-sm text-gray-500">
          Week {currentWeek} is in progress. Matchups will be scored when the week ends.
        </p>
      )}
      {phase === "complete" && (
        <p className="text-sm text-gray-500">
          The regular season has ended. View the final standings above.
        </p>
      )}
    </div>
  );
}
