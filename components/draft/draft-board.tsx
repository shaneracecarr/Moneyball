"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DraftCompleteSummary } from "./draft-complete-summary";
import {
  getDraftStateAction,
  makePickAction,
  searchAvailablePlayersAction,
  autoPickAction,
} from "@/lib/actions/draft";
import { getSnakeDraftPosition } from "@/lib/draft-utils";

type DraftPick = {
  pickNumber: number;
  round: number;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
  memberId: string;
  teamName: string | null;
};

type Member = {
  id: string;
  teamName: string | null;
  userName: string | null;
  userId: string | null;
};

type AvailablePlayer = {
  id: string;
  fullName: string;
  position: string;
  team: string | null;
  adp: number | null;
};

type DraftState = {
  draft: {
    id: string;
    status: "scheduled" | "in_progress" | "completed";
    numberOfRounds: number;
    currentPick: number;
  };
  order: {
    memberId: string;
    position: number;
    userName: string | null;
    userEmail: string | null;
    teamName: string | null;
  }[];
  picks: {
    id: string;
    memberId: string;
    playerId: string;
    pickNumber: number;
    round: number;
    pickedAt: Date;
    playerName: string;
    playerPosition: string;
    playerTeam: string | null;
    userName: string | null;
    userEmail: string | null;
    teamName: string | null;
  }[];
  onTheClockMemberId?: string;
  currentUserMemberId?: string;
  isCommissioner: boolean;
  numberOfTeams: number;
};

const POSITION_COLORS: Record<string, { bg: string; text: string }> = {
  QB: { bg: "bg-red-500", text: "text-white" },
  RB: { bg: "bg-emerald-500", text: "text-white" },
  WR: { bg: "bg-sky-500", text: "text-white" },
  TE: { bg: "bg-amber-500", text: "text-white" },
  K: { bg: "bg-purple-500", text: "text-white" },
  DEF: { bg: "bg-orange-700", text: "text-white" },
};

const POSITION_COLORS_LIGHT: Record<string, string> = {
  QB: "bg-red-50 border-red-200",
  RB: "bg-emerald-50 border-emerald-200",
  WR: "bg-sky-50 border-sky-200",
  TE: "bg-amber-50 border-amber-200",
  K: "bg-purple-50 border-purple-200",
  DEF: "bg-orange-50 border-orange-200",
};

const POSITION_TEXT: Record<string, string> = {
  QB: "text-red-700",
  RB: "text-emerald-700",
  WR: "text-sky-700",
  TE: "text-amber-700",
  K: "text-purple-700",
  DEF: "text-orange-700",
};

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

interface DraftBoardProps {
  leagueId: string;
  initialState: DraftState;
  members: Member[];
  draftTimerSeconds: number;
}

export function DraftBoard({
  leagueId,
  initialState,
  members,
  draftTimerSeconds,
}: DraftBoardProps) {
  const [state, setState] = useState<DraftState>(initialState);
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([]);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string | undefined>(undefined);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(draftTimerSeconds);
  const [isAutoPicking, setIsAutoPicking] = useState(false);
  const lastPickRef = useRef(initialState.draft.currentPick);
  const autoPickFiredRef = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const numberOfTeams = state.numberOfTeams;
  const numberOfRounds = state.draft.numberOfRounds;
  const totalPicks = numberOfTeams * numberOfRounds;
  const currentPick = state.draft.currentPick;
  const isMyTurn =
    state.draft.status === "in_progress" &&
    state.onTheClockMemberId === state.currentUserMemberId;

  const { round } = getSnakeDraftPosition(currentPick, numberOfTeams);

  const onClockEntry = state.order.find(
    (o) => o.memberId === state.onTheClockMemberId
  );
  const onClockName =
    onClockEntry?.teamName || onClockEntry?.userName || onClockEntry?.userEmail || "Unknown";

  // Map picks to the grid-compatible format
  const picks: DraftPick[] = state.picks.map((p) => ({
    pickNumber: p.pickNumber,
    round: p.round,
    playerName: p.playerName,
    playerPosition: p.playerPosition,
    playerTeam: p.playerTeam,
    memberId: p.memberId,
    teamName: p.teamName,
  }));

  // Build grid: picks indexed by [round][columnIndex]
  const pickGrid: (DraftPick | null)[][] = [];
  for (let r = 1; r <= numberOfRounds; r++) {
    const row: (DraftPick | null)[] = [];
    for (let col = 0; col < numberOfTeams; col++) {
      const pickNum = (r - 1) * numberOfTeams + (r % 2 === 1 ? col + 1 : numberOfTeams - col);
      const pick = picks.find((p) => p.pickNumber === pickNum);
      row.push(pick || null);
    }
    pickGrid.push(row);
  }

  // Figure out which cell is "on the clock"
  const onClockCell = (() => {
    if (currentPick > totalPicks) return null;
    const { round: r, positionInRound } = getSnakeDraftPosition(currentPick, numberOfTeams);
    const col = r % 2 === 1 ? positionInRound - 1 : numberOfTeams - positionInRound;
    return { round: r, col };
  })();

  // Load available players
  const loadPlayers = useCallback(async () => {
    if (!state.draft?.id) return;
    setIsLoadingPlayers(true);
    const result = await searchAvailablePlayersAction(state.draft.id, {
      search: search || undefined,
      position: positionFilter,
      limit: 100,
    });
    if (result.players) {
      setAvailablePlayers(result.players as AvailablePlayer[]);
    }
    setIsLoadingPlayers(false);
  }, [state.draft?.id, search, positionFilter]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  // Poll for state updates (other players' picks)
  const pollState = useCallback(async () => {
    const result = await getDraftStateAction(leagueId);
    if (result.draft && !result.error) {
      setState(result as DraftState);
    }
  }, [leagueId]);

  useEffect(() => {
    if (state.draft.status !== "in_progress") return;
    const interval = setInterval(pollState, 5000);
    return () => clearInterval(interval);
  }, [state.draft.status, pollState]);

  // Reset timer when pick changes
  useEffect(() => {
    if (currentPick !== lastPickRef.current) {
      lastPickRef.current = currentPick;
      setTimeLeft(draftTimerSeconds);
      autoPickFiredRef.current = false;
      setIsAutoPicking(false);
      loadPlayers();
    }
  }, [currentPick, draftTimerSeconds, loadPlayers]);

  // Countdown timer
  useEffect(() => {
    if (state.draft.status !== "in_progress") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [state.draft.status]);

  // Auto-pick when timer expires
  useEffect(() => {
    if (
      timeLeft === 0 &&
      state.draft.status === "in_progress" &&
      !autoPickFiredRef.current &&
      !isAutoPicking &&
      !isPicking
    ) {
      autoPickFiredRef.current = true;
      setIsAutoPicking(true);
      (async () => {
        const result = await autoPickAction(state.draft.id);
        if (!result.error) {
          await pollState();
        }
        setIsAutoPicking(false);
      })();
    }
  }, [timeLeft, state.draft.status, state.draft.id, isAutoPicking, isPicking, pollState]);

  // Format time as MM:SS
  const timerMinutes = Math.floor(timeLeft / 60);
  const timerSeconds = timeLeft % 60;
  const timerDisplay = `${timerMinutes}:${String(timerSeconds).padStart(2, "0")}`;
  const timerWarning = timeLeft <= 10;
  const timerCaution = timeLeft <= 30 && timeLeft > 10;

  async function handleDraftPlayer(playerId: string) {
    if (!isMyTurn || isPicking) return;
    setIsPicking(true);
    setError(null);

    const formData = new FormData();
    formData.set("draftId", state.draft.id);
    formData.set("playerId", playerId);

    const result = await makePickAction(formData);
    if (result.error) {
      setError(result.error);
    } else {
      await pollState();
    }
    setIsPicking(false);
  }

  // Completed draft
  if (state.draft.status === "completed") {
    return (
      <DraftCompleteSummary order={state.order} picks={state.picks} />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-900">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-bold text-sm">LIVE DRAFT</h2>
          <div className="h-4 w-px bg-gray-600" />
          <span className="text-gray-400 text-xs">
            Round {round} | Pick {currentPick} of {totalPicks}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div
            className={`font-mono text-lg font-bold px-3 py-0.5 rounded ${
              timerWarning
                ? "text-red-400 bg-red-900/50 animate-pulse"
                : timerCaution
                ? "text-yellow-400 bg-yellow-900/30"
                : "text-white bg-gray-700"
            }`}
          >
            {timerDisplay}
          </div>
          <div className="h-4 w-px bg-gray-600" />
          {isAutoPicking && (
            <span className="text-xs font-semibold text-yellow-400 animate-pulse">
              AUTO-PICKING...
            </span>
          )}
          {isMyTurn && !isPicking && !isAutoPicking && (
            <span className="text-xs font-semibold text-emerald-400 animate-pulse">
              YOUR PICK
            </span>
          )}
          {error && (
            <span className="text-xs text-red-400">{error}</span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-xs">OTC:</span>
            <span className="text-white text-xs font-semibold">{onClockName}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Draft Grid */}
        <div className="flex-1 overflow-auto" ref={gridRef}>
          <table className="w-full border-collapse min-w-[700px]">
            {/* Column Headers - Team Names */}
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="bg-gray-800 text-gray-500 text-[10px] font-semibold p-1.5 border-b border-gray-700 w-10 text-center sticky left-0 z-20">
                  RD
                </th>
                {members.map((member) => {
                  const isUser = member.id === state.currentUserMemberId;
                  const isOTC = member.id === state.onTheClockMemberId;
                  return (
                    <th
                      key={member.id}
                      className={`text-[10px] font-semibold p-1.5 border-b border-l border-gray-700 text-center truncate max-w-[100px] ${
                        isOTC
                          ? "bg-indigo-900 text-indigo-300"
                          : isUser
                          ? "bg-gray-700 text-blue-300"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      <div className="truncate">
                        {member.teamName || member.userName || "Team"}
                      </div>
                      {isUser && (
                        <span className="text-[8px] text-blue-400">YOU</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pickGrid.map((row, roundIndex) => {
                const r = roundIndex + 1;
                return (
                  <tr key={r}>
                    {/* Round number */}
                    <td className="bg-gray-800 text-gray-500 text-[10px] font-bold p-1.5 text-center border-b border-gray-700 sticky left-0 z-10">
                      {r}
                    </td>
                    {row.map((pick, colIndex) => {
                      const isOnClockCell =
                        onClockCell &&
                        onClockCell.round === r &&
                        onClockCell.col === colIndex;
                      const memberForCol = members[colIndex];
                      const isUserCol = memberForCol?.id === state.currentUserMemberId;

                      if (pick) {
                        const posColor =
                          POSITION_COLORS_LIGHT[pick.playerPosition] ||
                          "bg-gray-50 border-gray-200";
                        const posText =
                          POSITION_TEXT[pick.playerPosition] || "text-gray-700";
                        const posBadge =
                          POSITION_COLORS[pick.playerPosition] || {
                            bg: "bg-gray-500",
                            text: "text-white",
                          };

                        return (
                          <td
                            key={colIndex}
                            className="border border-gray-700 p-0 align-top"
                          >
                            <div className={`p-1.5 h-full ${posColor} border`}>
                              <div className="flex items-center gap-1 mb-0.5">
                                <span
                                  className={`text-[9px] font-bold px-1 py-px rounded ${posBadge.bg} ${posBadge.text}`}
                                >
                                  {pick.playerPosition}
                                </span>
                                <span className="text-[9px] text-gray-400">
                                  {pick.pickNumber}
                                </span>
                              </div>
                              <p
                                className={`text-[11px] font-semibold leading-tight ${posText}`}
                              >
                                {pick.playerName}
                              </p>
                              {pick.playerTeam && (
                                <p className="text-[9px] text-gray-400 mt-0.5">
                                  {pick.playerTeam}
                                </p>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // Empty cell
                      return (
                        <td
                          key={colIndex}
                          className="border border-gray-700 p-0"
                        >
                          <div
                            className={`p-1.5 h-full min-h-[52px] ${
                              isOnClockCell
                                ? "bg-indigo-900/50 ring-2 ring-inset ring-indigo-400"
                                : isUserCol
                                ? "bg-gray-800/80"
                                : "bg-gray-800/40"
                            }`}
                          >
                            {isOnClockCell && (
                              <span className="text-[9px] text-indigo-400 font-medium">
                                On Clock
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Panel: Available Players */}
        <div className="w-[320px] bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Panel Header */}
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-white text-xs font-bold mb-2 uppercase tracking-wider">
              Available Players
            </h3>
            <Input
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 text-xs h-8"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                onClick={() => setPositionFilter(undefined)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  !positionFilter
                    ? "bg-white text-gray-900"
                    : "bg-gray-700 text-gray-400 hover:text-white"
                }`}
              >
                ALL
              </button>
              {POSITIONS.map((pos) => {
                const colors = POSITION_COLORS[pos];
                return (
                  <button
                    key={pos}
                    onClick={() =>
                      setPositionFilter(pos === positionFilter ? undefined : pos)
                    }
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      positionFilter === pos
                        ? `${colors.bg} ${colors.text}`
                        : "bg-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingPlayers ? (
              <p className="text-xs text-gray-500 p-3">Loading players...</p>
            ) : (
              availablePlayers.map((player) => {
                const posBadge = POSITION_COLORS[player.position] || {
                  bg: "bg-gray-500",
                  text: "text-white",
                };
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 hover:bg-gray-700/50 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${posBadge.bg} ${posBadge.text}`}
                      >
                        {player.position}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {player.fullName}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {player.team || "FA"}
                          {player.adp != null && (
                            <span className="ml-1 text-gray-600">
                              ADP {player.adp}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isMyTurn && !isPicking && (
                      <Button
                        size="sm"
                        onClick={() => handleDraftPlayer(player.id)}
                        className="h-6 text-[10px] px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Draft
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Position Legend */}
          <div className="p-2 border-t border-gray-700 flex flex-wrap gap-1.5 justify-center">
            {POSITIONS.map((pos) => {
              const colors = POSITION_COLORS[pos];
              return (
                <span
                  key={pos}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                >
                  {pos}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
