"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamRoster } from "@/components/draft/team-roster";
import { DraftCompleteSummary } from "@/components/draft/draft-complete-summary";
import { getSnakeDraftPosition } from "@/lib/draft-utils";
import { MockDraftSetup } from "./mock-draft-setup";
import { PlayerNameLink } from "@/components/player-card/player-name-link";

type Player = {
  id: string;
  fullName: string;
  position: string;
  team: string | null;
};

type DraftPick = {
  memberId: string;
  pickNumber: number;
  round: number;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
  playerId: string;
};

type TeamInfo = {
  memberId: string;
  name: string;
  position: number;
};

// AI pick priority by round
function getPositionPriority(round: number): string[] {
  if (round <= 2) return ["RB", "WR"];
  if (round <= 4) return ["RB", "WR", "QB"];
  if (round <= 8) return ["WR", "RB", "TE", "QB"];
  if (round <= 12) return ["WR", "RB", "TE", "QB", "K"];
  return ["K", "DEF", "WR", "RB", "TE", "QB"];
}

function aiSelectPlayer(
  availablePlayers: Player[],
  round: number
): Player | undefined {
  const priorities = getPositionPriority(round);

  for (const pos of priorities) {
    const candidates = availablePlayers.filter((p) => p.position === pos);
    if (candidates.length > 0) {
      // Random pick within the priority pool for variety
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  // Fallback: best available (random)
  if (availablePlayers.length > 0) {
    return availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
  }
  return undefined;
}

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
  "Mike Mustangs",
  "November Ninjas",
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

  // Player list filters
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string | undefined>(undefined);

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPicks = numberOfTeams * numberOfRounds;

  // Build draft order (maps position 1..N to memberId)
  const draftOrder = teams.map((t) => ({ memberId: t.memberId, position: t.position }));

  // Who picks at currentPick?
  const getCurrentMemberId = useCallback(
    (pick: number) => {
      const { positionInRound } = getSnakeDraftPosition(pick, numberOfTeams);
      const entry = draftOrder.find((o) => o.position === positionInRound);
      return entry?.memberId;
    },
    [numberOfTeams, draftOrder]
  );

  const onTheClockMemberId = getCurrentMemberId(currentPick);
  const isUserTurn = onTheClockMemberId === userMemberId && !isComplete;

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
        newTeams.push({ memberId: userId, name: "Your Team", position: i });
      } else {
        newTeams.push({
          memberId: `ai-${i}`,
          name: AI_TEAM_NAMES[aiIndex % AI_TEAM_NAMES.length],
          position: i,
        });
        aiIndex++;
      }
    }

    setTeams(newTeams);
    setPicks([]);
    setDraftedPlayerIds(new Set());
    setCurrentPick(1);
    setIsComplete(false);
    setStarted(true);
  }

  // Make a pick (used by both user and AI)
  const makePick = useCallback(
    (playerId: string, memberId: string, pickNum: number) => {
      const player = allPlayers.find((p) => p.id === playerId);
      if (!player) return;

      const { round } = getSnakeDraftPosition(pickNum, numberOfTeams);

      const pick: DraftPick = {
        memberId,
        pickNumber: pickNum,
        round,
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
    [allPlayers, numberOfTeams, numberOfRounds]
  );

  // AI auto-pick effect
  useEffect(() => {
    if (!started || isComplete) return;

    const memberId = getCurrentMemberId(currentPick);
    if (!memberId || memberId === userMemberId) return;

    // AI's turn - pick after a delay
    aiTimerRef.current = setTimeout(() => {
      const available = allPlayers.filter((p) => !draftedPlayerIds.has(p.id));
      const { round } = getSnakeDraftPosition(currentPick, numberOfTeams);
      const selected = aiSelectPlayer(available, round);
      if (selected) {
        makePick(selected.id, memberId, currentPick);
      }
    }, 500);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [started, isComplete, currentPick, userMemberId, getCurrentMemberId, draftedPlayerIds, allPlayers, numberOfTeams, makePick]);

  function handleUserPick(playerId: string) {
    if (!isUserTurn) return;
    makePick(playerId, userMemberId, currentPick);
  }

  // Setup screen
  if (!started) {
    return <MockDraftSetup onStart={handleStart} />;
  }

  // Draft complete
  if (isComplete) {
    const summaryOrder = teams.map((t) => ({
      memberId: t.memberId,
      userName: t.name,
      userEmail: t.name,
      teamName: t.name,
    }));

    const summaryPicks = picks.map((p) => ({
      ...p,
      userName: teams.find((t) => t.memberId === p.memberId)?.name || null,
      userEmail: teams.find((t) => t.memberId === p.memberId)?.name || "",
      teamName: teams.find((t) => t.memberId === p.memberId)?.name || null,
    }));

    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-center">
          <Button onClick={() => setStarted(false)}>New Mock Draft</Button>
        </div>
        <DraftCompleteSummary order={summaryOrder} picks={summaryPicks} />
      </div>
    );
  }

  // Build per-team picks
  const teamPicksMap = new Map<string, DraftPick[]>();
  for (const team of teams) {
    teamPicksMap.set(team.memberId, []);
  }
  for (const pick of picks) {
    const existing = teamPicksMap.get(pick.memberId) || [];
    existing.push(pick);
    teamPicksMap.set(pick.memberId, existing);
  }

  const currentPickInfo = getSnakeDraftPosition(currentPick, numberOfTeams);
  const onClockTeam = teams.find((t) => t.memberId === onTheClockMemberId);
  const onClockName = onClockTeam?.name || "Unknown";

  // Recent picks (last 5)
  const recentPicks = [...picks].sort((a, b) => b.pickNumber - a.pickNumber).slice(0, 5);

  // Available players with filters
  const availablePlayers = allPlayers.filter((p) => {
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

  const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px] h-[calc(100vh-120px)] p-4">
      {/* Left: Team Rosters */}
      <div className="overflow-y-auto space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 px-1">Teams</h3>
        {teams.map((team) => (
          <TeamRoster
            key={team.memberId}
            teamName={team.name}
            picks={(teamPicksMap.get(team.memberId) || []).map((p) => ({
              pickNumber: p.pickNumber,
              round: p.round,
              playerName: p.playerName,
              playerPosition: p.playerPosition,
              playerTeam: p.playerTeam,
              playerId: p.playerId,
            }))}
            isOnTheClock={team.memberId === onTheClockMemberId}
            isCurrentUser={team.memberId === userMemberId}
          />
        ))}
      </div>

      {/* Center: Draft Status */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Round {currentPickInfo.round}, Pick {currentPick} of {totalPicks}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">On the clock:</span>
                <span className="font-semibold text-indigo-600">{onClockName}</span>
              </div>
              {isUserTurn && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-indigo-800">
                    It&apos;s your turn! Select a player from the list.
                  </p>
                </div>
              )}
              {!isUserTurn && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    AI is picking...
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Picks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Picks</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPicks.length === 0 ? (
              <p className="text-sm text-gray-500">No picks yet</p>
            ) : (
              <div className="space-y-2">
                {recentPicks.map((pick) => {
                  const team = teams.find((t) => t.memberId === pick.memberId);
                  return (
                    <div key={pick.pickNumber} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 w-8">#{pick.pickNumber}</span>
                      <PlayerNameLink playerId={pick.playerId} playerName={pick.playerName} className="font-medium" />
                      <span className="text-gray-500">{pick.playerPosition}</span>
                      <span className="text-gray-400 ml-auto text-xs">
                        {team?.name || "Unknown"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Available Players */}
      <div className="overflow-hidden flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 px-1 mb-2">Available Players</h3>
        <div className="flex flex-col h-full">
          <div className="space-y-3 mb-3">
            <Input
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-1">
              <Button
                variant={!positionFilter ? "default" : "outline"}
                size="sm"
                onClick={() => setPositionFilter(undefined)}
              >
                All
              </Button>
              {POSITIONS.map((pos) => (
                <Button
                  key={pos}
                  variant={positionFilter === pos ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPositionFilter(pos === positionFilter ? undefined : pos)}
                >
                  {pos}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {availablePlayers.slice(0, 50).map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50"
              >
                <div>
                  <PlayerNameLink playerId={player.id} playerName={player.fullName} className="text-sm font-medium" />
                  <p className="text-xs text-gray-500">
                    {player.position} {player.team ? `- ${player.team}` : ""}
                  </p>
                </div>
                {isUserTurn && (
                  <Button
                    size="sm"
                    onClick={() => handleUserPick(player.id)}
                  >
                    Draft
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
