"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSnakeDraftPosition } from "@/lib/draft-utils";
import { MockDraftSetup } from "./mock-draft-setup";

type Player = {
  id: string;
  fullName: string;
  position: string;
  team: string | null;
  adp: number | null;
};

type DraftPick = {
  pickNumber: number;
  round: number;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
  memberId: string;
  playerId: string;
};

type TeamInfo = {
  memberId: string;
  name: string;
  position: number;
  isUser: boolean;
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

const AI_TEAM_NAMES = [
  "Alpha Squad",
  "Bravo Bombers",
  "Charlie Chargers",
  "Delta Force",
  "Echo Eagles",
  "Foxtrot Falcons",
  "Golf Giants",
  "Hotel Hawks",
  "India Ironmen",
  "Juliet Jaguars",
  "Kilo Knights",
  "Lima Lions",
];

interface MockDraftBoardProps {
  allPlayers: Player[];
}

export function MockDraftBoard({ allPlayers }: MockDraftBoardProps) {
  const [started, setStarted] = useState(false);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [userMemberId, setUserMemberId] = useState("");
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [currentPick, setCurrentPick] = useState(1);
  const [numberOfTeams, setNumberOfTeams] = useState(12);
  const [numberOfRounds, setNumberOfRounds] = useState(15);
  const [draftedPlayerIds, setDraftedPlayerIds] = useState<Set<string>>(new Set());
  const [isComplete, setIsComplete] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(90);
  const [draftTimerSeconds] = useState(90);

  // Player list filters
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string | undefined>(undefined);

  // AI state
  const [isAiPicking, setIsAiPicking] = useState(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPickRef = useRef(1);

  const totalPicks = numberOfTeams * numberOfRounds;

  // Who picks at currentPick?
  const getCurrentMemberId = useCallback(
    (pick: number) => {
      const { positionInRound } = getSnakeDraftPosition(pick, numberOfTeams);
      const team = teams.find((t) => t.position === positionInRound);
      return team?.memberId;
    },
    [numberOfTeams, teams]
  );

  const onTheClockMemberId = getCurrentMemberId(currentPick);
  const onClockTeam = teams.find((t) => t.memberId === onTheClockMemberId);
  const isUserTurn = onTheClockMemberId === userMemberId && !isComplete;
  const isAiTurn = !isUserTurn && !isComplete && started;

  const { round } = getSnakeDraftPosition(currentPick, numberOfTeams);

  // Sort players by ADP for AI picks
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    if (a.adp === null && b.adp === null) return 0;
    if (a.adp === null) return 1;
    if (b.adp === null) return -1;
    return a.adp - b.adp;
  });

  function handleStart(settings: { numberOfTeams: number; numberOfRounds: number; userPosition: number }) {
    const { numberOfTeams: numTeams, numberOfRounds: numRounds, userPosition } = settings;
    setNumberOfTeams(numTeams);
    setNumberOfRounds(numRounds);

    const userId = "user-team";
    setUserMemberId(userId);

    const newTeams: TeamInfo[] = [];
    let aiIndex = 0;
    for (let i = 1; i <= numTeams; i++) {
      if (i === userPosition) {
        newTeams.push({ memberId: userId, name: "Your Team", position: i, isUser: true });
      } else {
        newTeams.push({
          memberId: `ai-${i}`,
          name: AI_TEAM_NAMES[aiIndex % AI_TEAM_NAMES.length],
          position: i,
          isUser: false,
        });
        aiIndex++;
      }
    }

    setTeams(newTeams);
    setPicks([]);
    setDraftedPlayerIds(new Set());
    setCurrentPick(1);
    setIsComplete(false);
    setTimeLeft(draftTimerSeconds);
    setStarted(true);
  }

  // Make a pick
  const makePick = useCallback(
    (playerId: string, memberId: string, pickNum: number) => {
      const player = sortedPlayers.find((p) => p.id === playerId);
      if (!player) return;

      const { round: r } = getSnakeDraftPosition(pickNum, numberOfTeams);

      const pick: DraftPick = {
        memberId,
        pickNumber: pickNum,
        round: r,
        playerName: player.fullName,
        playerPosition: player.position,
        playerTeam: player.team,
        playerId: player.id,
      };

      setPicks((prev) => [...prev, pick]);
      setDraftedPlayerIds((prev) => new Set(prev).add(playerId));

      const nextPick = pickNum + 1;
      if (nextPick > numberOfTeams * numberOfRounds) {
        setIsComplete(true);
      } else {
        setCurrentPick(nextPick);
      }
    },
    [sortedPlayers, numberOfTeams, numberOfRounds]
  );

  // Reset timer when pick changes
  useEffect(() => {
    if (currentPick !== lastPickRef.current) {
      lastPickRef.current = currentPick;
      setTimeLeft(draftTimerSeconds);
    }
  }, [currentPick, draftTimerSeconds]);

  // Countdown timer
  useEffect(() => {
    if (!started || isComplete) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [started, isComplete]);

  // AI auto-pick effect - picks best available by ADP
  useEffect(() => {
    if (!started || isComplete || !isAiTurn || isAiPicking) return;

    setIsAiPicking(true);

    aiTimerRef.current = setTimeout(() => {
      const memberId = getCurrentMemberId(currentPick);
      if (!memberId) {
        setIsAiPicking(false);
        return;
      }

      // Find best available player by ADP
      const available = sortedPlayers.filter((p) => !draftedPlayerIds.has(p.id));
      if (available.length > 0) {
        makePick(available[0].id, memberId, currentPick);
      }
      setIsAiPicking(false);
    }, 800);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [started, isComplete, isAiTurn, isAiPicking, currentPick, getCurrentMemberId, draftedPlayerIds, sortedPlayers, makePick]);

  function handleUserPick(playerId: string) {
    if (!isUserTurn) return;
    makePick(playerId, userMemberId, currentPick);
  }

  // Setup screen
  if (!started) {
    return <MockDraftSetup onStart={handleStart} />;
  }

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

  // Available players with filters
  const availablePlayers = sortedPlayers.filter((p) => {
    if (draftedPlayerIds.has(p.id)) return false;
    if (positionFilter && p.position !== positionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.fullName.toLowerCase().includes(q) ||
        (p.team && p.team.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Timer display
  const timerMinutes = Math.floor(timeLeft / 60);
  const timerSeconds = timeLeft % 60;
  const timerDisplay = `${timerMinutes}:${String(timerSeconds).padStart(2, "0")}`;
  const timerWarning = timeLeft <= 10;
  const timerCaution = timeLeft <= 30 && timeLeft > 10;

  // Draft complete
  if (isComplete) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-900">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <h2 className="text-white font-bold">MOCK DRAFT COMPLETE</h2>
          <Button onClick={() => setStarted(false)} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
            New Mock Draft
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="bg-gray-900 text-gray-500 text-[10px] font-semibold p-2 border-b border-gray-700 w-10 text-center">
                    RD
                  </th>
                  {teams.map((team) => (
                    <th
                      key={team.memberId}
                      className={`text-[10px] font-semibold p-2 border-b border-l border-gray-700 text-center ${
                        team.isUser ? "bg-gray-700 text-blue-300" : "bg-gray-900 text-gray-400"
                      }`}
                    >
                      {team.name}
                      {team.isUser && <span className="text-[8px] text-blue-400 ml-1">YOU</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pickGrid.map((row, roundIndex) => (
                  <tr key={roundIndex + 1}>
                    <td className="bg-gray-900 text-gray-500 text-[10px] font-bold p-2 text-center border-b border-gray-700">
                      {roundIndex + 1}
                    </td>
                    {row.map((pick, colIndex) => {
                      if (pick) {
                        const posColor = POSITION_COLORS_LIGHT[pick.playerPosition] || "bg-gray-50 border-gray-200";
                        const posText = POSITION_TEXT[pick.playerPosition] || "text-gray-700";
                        const posBadge = POSITION_COLORS[pick.playerPosition] || { bg: "bg-gray-500", text: "text-white" };
                        return (
                          <td key={colIndex} className="border border-gray-700 p-0">
                            <div className={`p-1.5 ${posColor} border`}>
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className={`text-[9px] font-bold px-1 py-px rounded ${posBadge.bg} ${posBadge.text}`}>
                                  {pick.playerPosition}
                                </span>
                              </div>
                              <p className={`text-[11px] font-semibold leading-tight ${posText}`}>
                                {pick.playerName}
                              </p>
                            </div>
                          </td>
                        );
                      }
                      return <td key={colIndex} className="border border-gray-700 bg-gray-800/40 p-1.5" />;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-900">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-bold text-sm">MOCK DRAFT</h2>
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
          {isAiPicking && (
            <span className="text-xs font-semibold text-purple-400 animate-pulse">
              AI PICKING...
            </span>
          )}
          {isAiTurn && !isAiPicking && (
            <span className="text-xs font-semibold text-purple-400">
              AI TURN
            </span>
          )}
          {isUserTurn && (
            <span className="text-xs font-semibold text-emerald-400 animate-pulse">
              YOUR PICK
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-xs">OTC:</span>
            <span className="text-white text-xs font-semibold">{onClockTeam?.name || "Unknown"}</span>
          </div>
          <Button
            onClick={() => setStarted(false)}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white text-xs"
          >
            Exit
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Draft Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="bg-gray-800 text-gray-500 text-[10px] font-semibold p-1.5 border-b border-gray-700 w-10 text-center sticky left-0 z-20">
                  RD
                </th>
                {teams.map((team) => {
                  const isOTC = team.memberId === onTheClockMemberId;
                  return (
                    <th
                      key={team.memberId}
                      className={`text-[10px] font-semibold p-1.5 border-b border-l border-gray-700 text-center truncate max-w-[100px] ${
                        isOTC
                          ? "bg-indigo-900 text-indigo-300"
                          : team.isUser
                          ? "bg-gray-700 text-blue-300"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      <div className="truncate">{team.name}</div>
                      {team.isUser && <span className="text-[8px] text-blue-400">YOU</span>}
                      {!team.isUser && <span className="text-[8px] text-purple-400">AI</span>}
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
                    <td className="bg-gray-800 text-gray-500 text-[10px] font-bold p-1.5 text-center border-b border-gray-700 sticky left-0 z-10">
                      {r}
                    </td>
                    {row.map((pick, colIndex) => {
                      const isOnClockCell = onClockCell && onClockCell.round === r && onClockCell.col === colIndex;
                      const teamForCol = teams[colIndex];
                      const isUserCol = teamForCol?.isUser;

                      if (pick) {
                        const posColor = POSITION_COLORS_LIGHT[pick.playerPosition] || "bg-gray-50 border-gray-200";
                        const posText = POSITION_TEXT[pick.playerPosition] || "text-gray-700";
                        const posBadge = POSITION_COLORS[pick.playerPosition] || { bg: "bg-gray-500", text: "text-white" };

                        return (
                          <td key={colIndex} className="border border-gray-700 p-0 align-top">
                            <div className={`p-1.5 h-full ${posColor} border`}>
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className={`text-[9px] font-bold px-1 py-px rounded ${posBadge.bg} ${posBadge.text}`}>
                                  {pick.playerPosition}
                                </span>
                                <span className="text-[9px] text-gray-400">{pick.pickNumber}</span>
                              </div>
                              <p className={`text-[11px] font-semibold leading-tight ${posText}`}>
                                {pick.playerName}
                              </p>
                              {pick.playerTeam && (
                                <p className="text-[9px] text-gray-400 mt-0.5">{pick.playerTeam}</p>
                              )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={colIndex} className="border border-gray-700 p-0">
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
                              <span className="text-[9px] text-indigo-400 font-medium">On Clock</span>
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
                  !positionFilter ? "bg-white text-gray-900" : "bg-gray-700 text-gray-400 hover:text-white"
                }`}
              >
                ALL
              </button>
              {POSITIONS.map((pos) => {
                const colors = POSITION_COLORS[pos];
                return (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos === positionFilter ? undefined : pos)}
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

          <div className="flex-1 overflow-y-auto">
            {availablePlayers.slice(0, 100).map((player) => {
              const posBadge = POSITION_COLORS[player.position] || { bg: "bg-gray-500", text: "text-white" };
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 hover:bg-gray-700/50 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${posBadge.bg} ${posBadge.text}`}>
                      {player.position}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{player.fullName}</p>
                      <p className="text-[10px] text-gray-500">
                        {player.team || "FA"}
                        {player.adp != null && (
                          <span className="ml-1 text-gray-600">ADP {player.adp}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {isUserTurn && (
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
            })}
          </div>

          <div className="p-2 border-t border-gray-700 flex flex-wrap gap-1.5 justify-center">
            {POSITIONS.map((pos) => {
              const colors = POSITION_COLORS[pos];
              return (
                <span key={pos} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
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
