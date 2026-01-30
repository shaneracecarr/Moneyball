"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  makeBotDraftPicksAction,
  makeUserDraftPickAction,
  getMockLeagueStateAction,
  searchMockDraftPlayersAction,
} from "@/lib/actions/mock-league";
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
  isBot: boolean;
  userId: string | null;
};

type AvailablePlayer = {
  id: string;
  fullName: string;
  position: string;
  team: string | null;
  adp: number | null;
};

const POSITION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  QB: { bg: "bg-red-500", text: "text-white", border: "border-red-600" },
  RB: { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600" },
  WR: { bg: "bg-sky-500", text: "text-white", border: "border-sky-600" },
  TE: { bg: "bg-amber-500", text: "text-white", border: "border-amber-600" },
  K: { bg: "bg-purple-500", text: "text-white", border: "border-purple-600" },
  DEF: { bg: "bg-orange-700", text: "text-white", border: "border-orange-800" },
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

interface MockLeagueDraftProps {
  leagueId: string;
  draftId: string;
  currentPick: number;
  numberOfTeams: number;
  numberOfRounds: number;
  members: Member[];
  onTheClockMemberId: string | undefined;
  currentUserMemberId: string;
  initialPicks: DraftPick[];
}

export function MockLeagueDraft({
  leagueId,
  draftId,
  currentPick: initialCurrentPick,
  numberOfTeams,
  numberOfRounds,
  members,
  onTheClockMemberId: initialOnTheClock,
  currentUserMemberId,
  initialPicks,
}: MockLeagueDraftProps) {
  const router = useRouter();
  const [picks, setPicks] = useState<DraftPick[]>(initialPicks);
  const [currentPick, setCurrentPick] = useState(initialCurrentPick);
  const [onTheClockMemberId, setOnTheClockMemberId] = useState(initialOnTheClock);
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([]);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [botPicking, setBotPicking] = useState(false);
  const hasInitialized = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const totalPicks = numberOfTeams * numberOfRounds;
  const isUserTurn = onTheClockMemberId === currentUserMemberId;
  const { round } = getSnakeDraftPosition(currentPick, numberOfTeams);

  const onClockMember = members.find((m) => m.id === onTheClockMemberId);
  const onClockName = onClockMember?.teamName || onClockMember?.userName || "Unknown";

  // Build draft order: position -> memberId mapping
  // Members are already in draft order based on how they were set up
  // We need to figure out column order from the draft order
  // For simplicity, use members array order as the column order
  const memberOrder = members;

  // Build grid: picks indexed by [round][columnIndex]
  const pickGrid: (DraftPick | null)[][] = [];
  for (let r = 1; r <= numberOfRounds; r++) {
    const row: (DraftPick | null)[] = [];
    for (let col = 0; col < numberOfTeams; col++) {
      // Snake: odd rounds normal order, even rounds reversed
      const posInRound = r % 2 === 1 ? col + 1 : numberOfTeams - col;
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
    // positionInRound is 1-based, maps to column
    // In odd rounds, pos 1 = col 0. In even rounds, pos N = col 0 (reversed display).
    const col = r % 2 === 1 ? positionInRound - 1 : numberOfTeams - positionInRound;
    return { round: r, col };
  })();

  // Load available players
  const loadPlayers = useCallback(async () => {
    setIsLoadingPlayers(true);
    const result = await searchMockDraftPlayersAction(leagueId, {
      search: search || undefined,
      position: positionFilter,
      limit: 100,
    });
    if (result.players) {
      setAvailablePlayers(result.players as AvailablePlayer[]);
    }
    setIsLoadingPlayers(false);
  }, [leagueId, search, positionFilter]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  // Trigger bot picks
  const triggerBotPicks = useCallback(async () => {
    if (isUserTurn || botPicking) return;
    setBotPicking(true);

    const result = await makeBotDraftPicksAction(leagueId);

    if (result.draftComplete) {
      router.push(`/mock-league/${leagueId}`);
      return;
    }

    const stateResult = await getMockLeagueStateAction(leagueId);
    if (stateResult.draft && stateResult.draftPicks) {
      setCurrentPick(stateResult.draft.currentPick);
      setOnTheClockMemberId(stateResult.onTheClockMemberId);
      setPicks(
        stateResult.draftPicks.map((p: any) => ({
          pickNumber: p.pickNumber,
          round: p.round,
          playerName: p.playerName,
          playerPosition: p.playerPosition,
          playerTeam: p.playerTeam,
          memberId: p.memberId,
          teamName: p.teamName,
        }))
      );
      loadPlayers();
    }
    setBotPicking(false);
  }, [leagueId, isUserTurn, botPicking, router, loadPlayers]);

  // Initial bot picks on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      if (!isUserTurn) {
        triggerBotPicks();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleUserPick(playerId: string) {
    if (!isUserTurn || isPending) return;

    startTransition(async () => {
      const result = await makeUserDraftPickAction(leagueId, playerId);
      if (result.error) return;

      if (result.draftComplete) {
        router.push(`/mock-league/${leagueId}`);
        return;
      }

      const stateResult = await getMockLeagueStateAction(leagueId);
      if (stateResult.draft && stateResult.draftPicks) {
        setCurrentPick(stateResult.draft.currentPick);
        setOnTheClockMemberId(stateResult.onTheClockMemberId);
        setPicks(
          stateResult.draftPicks.map((p: any) => ({
            pickNumber: p.pickNumber,
            round: p.round,
            playerName: p.playerName,
            playerPosition: p.playerPosition,
            playerTeam: p.playerTeam,
            memberId: p.memberId,
            teamName: p.teamName,
          }))
        );
        loadPlayers();
      }
    });
  }

  const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-900">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-bold text-sm">MOCK LEAGUE DRAFT</h2>
          <div className="h-4 w-px bg-gray-600" />
          <span className="text-gray-400 text-xs">
            Round {round} | Pick {currentPick} of {totalPicks}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isUserTurn && !isPending && !botPicking && (
            <span className="text-xs font-semibold text-emerald-400 animate-pulse">
              YOUR PICK
            </span>
          )}
          {botPicking && (
            <span className="text-xs text-gray-400">Bots picking...</span>
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
                {memberOrder.map((member) => {
                  const isUser = member.id === currentUserMemberId;
                  const isOTC = member.id === onTheClockMemberId;
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
                        {member.teamName || member.userName || "Bot"}
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
                const isSnakeReversed = r % 2 === 0;
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
                      const memberForCol = memberOrder[colIndex];
                      const isUserCol = memberForCol?.id === currentUserMemberId;

                      if (pick) {
                        // Filled pick cell
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
                            className={`border border-gray-700 p-0 align-top`}
                          >
                            <div
                              className={`p-1.5 h-full ${posColor} border`}
                            >
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
                          className={`border border-gray-700 p-0`}
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
                    {isUserTurn && !isPending && !botPicking && (
                      <Button
                        size="sm"
                        onClick={() => handleUserPick(player.id)}
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
