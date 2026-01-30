"use client";

import { useState, useTransition } from "react";
import { getMatchupAction } from "@/lib/actions/matchups";
import { MatchupPlayerRow } from "./matchup-player-row";
import { Button } from "@/components/ui/button";

type RosterPlayer = {
  id: string;
  slot: string;
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
};

type TeamInfo = {
  memberId: string;
  teamName: string | null;
  userName: string | null;
};

interface MatchupViewProps {
  leagueId: string;
  initialWeek: number;
  initialUserRoster: RosterPlayer[];
  initialOpponentRoster: RosterPlayer[];
  initialUserTeam: TeamInfo | null;
  initialOpponentTeam: TeamInfo | null;
  initialUserScore: number | null;
  initialOpponentScore: number | null;
  hasMatchup: boolean;
  starterSlots: string[];
  benchSlots: string[];
}

function getPlayerForSlot(roster: RosterPlayer[], slot: string) {
  return roster.find((r) => r.slot === slot) || null;
}

function TeamInitial({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
      {initial}
    </div>
  );
}

function formatScore(score: number | null): string {
  return score !== null ? score.toFixed(1) : "-";
}

export function MatchupView({
  leagueId,
  initialWeek,
  initialUserRoster,
  initialOpponentRoster,
  initialUserTeam,
  initialOpponentTeam,
  initialUserScore,
  initialOpponentScore,
  hasMatchup,
  starterSlots,
  benchSlots,
}: MatchupViewProps) {
  const [week, setWeek] = useState(initialWeek);
  const [userRoster, setUserRoster] = useState(initialUserRoster);
  const [opponentRoster, setOpponentRoster] = useState(initialOpponentRoster);
  const [userTeam, setUserTeam] = useState(initialUserTeam);
  const [opponentTeam, setOpponentTeam] = useState(initialOpponentTeam);
  const [userScore, setUserScore] = useState(initialUserScore);
  const [opponentScore, setOpponentScore] = useState(initialOpponentScore);
  const [hasData, setHasData] = useState(hasMatchup);
  const [isPending, startTransition] = useTransition();

  const changeWeek = (newWeek: number) => {
    if (newWeek < 1 || newWeek > 17) return;
    setWeek(newWeek);

    startTransition(async () => {
      const result = await getMatchupAction(leagueId, newWeek);
      if (result.error) return;

      if (!result.matchup) {
        setHasData(false);
        setUserRoster([]);
        setOpponentRoster([]);
        setUserTeam(null);
        setOpponentTeam(null);
        setUserScore(null);
        setOpponentScore(null);
        return;
      }

      setHasData(true);
      setUserRoster(result.userRoster || []);
      setOpponentRoster(result.opponentRoster || []);
      setUserTeam(result.userTeam || null);
      setOpponentTeam(result.opponentTeam || null);

      // Determine which side the user is on
      const matchup = result.matchup;
      const isTeam1 = matchup.team1MemberId === result.userTeam?.memberId;
      setUserScore(isTeam1 ? matchup.team1Score : matchup.team2Score);
      setOpponentScore(isTeam1 ? matchup.team2Score : matchup.team1Score);
    });
  };

  const userName = userTeam?.teamName || userTeam?.userName || "Your Team";
  const opponentName = opponentTeam?.teamName || opponentTeam?.userName || "Opponent";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Week Selector */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => changeWeek(week - 1)}
          disabled={week <= 1 || isPending}
        >
          ←
        </Button>
        <span className="text-lg font-semibold text-gray-800 min-w-[100px] text-center">
          Week {week}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => changeWeek(week + 1)}
          disabled={week >= 17 || isPending}
        >
          →
        </Button>
      </div>

      {!hasData ? (
        <div className="rounded-lg bg-slate-800 text-white p-12 text-center">
          <p className="text-lg">No matchup this week</p>
          <p className="text-sm text-slate-400 mt-2">
            The schedule may not have been generated yet.
          </p>
        </div>
      ) : (
        <>
          {/* Score Banner */}
          <div className="rounded-t-lg bg-slate-800 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TeamInitial name={userName} />
                <div className="text-left">
                  <p className="text-white font-semibold text-sm truncate max-w-[140px]">
                    {userName}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-3xl font-bold text-white tabular-nums">
                  {formatScore(userScore)}{" "}
                  <span className="text-slate-500 mx-2">-</span>{" "}
                  {formatScore(opponentScore)}
                </p>
                {userScore === null && opponentScore === null && (
                  <p className="text-xs text-slate-400 mt-1">Not yet scored</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-white font-semibold text-sm truncate max-w-[140px]">
                    {opponentName}
                  </p>
                </div>
                <TeamInitial name={opponentName} />
              </div>
            </div>
          </div>

          {/* Roster Comparison */}
          <div className="border border-t-0 border-gray-200 rounded-b-lg bg-white overflow-hidden">
            {/* Starters Header */}
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Starters
              </p>
            </div>

            {/* Starters Grid */}
            <div className="grid grid-cols-[1fr_auto_1fr]">
              {starterSlots.map((slot) => {
                const userPlayer = getPlayerForSlot(userRoster, slot);
                const opponentPlayer = getPlayerForSlot(opponentRoster, slot);

                return (
                  <div key={slot} className="contents">
                    {/* Left - User */}
                    <MatchupPlayerRow
                      slot={slot}
                      playerName={userPlayer?.playerName || null}
                      playerPosition={userPlayer?.playerPosition || null}
                      playerTeam={userPlayer?.playerTeam || null}
                      playerId={userPlayer?.playerId || null}
                      side="left"
                    />
                    {/* Slot Label */}
                    <div className="flex items-center justify-center px-2 border-b border-gray-100 bg-gray-50 min-w-[48px]">
                      <span className="text-xs font-bold text-gray-400">{slot}</span>
                    </div>
                    {/* Right - Opponent */}
                    <MatchupPlayerRow
                      slot={slot}
                      playerName={opponentPlayer?.playerName || null}
                      playerPosition={opponentPlayer?.playerPosition || null}
                      playerTeam={opponentPlayer?.playerTeam || null}
                      playerId={opponentPlayer?.playerId || null}
                      side="right"
                    />
                  </div>
                );
              })}
            </div>

            {/* Bench Header */}
            <div className="bg-gray-50 px-4 py-2 border-b border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Bench
              </p>
            </div>

            {/* Bench Grid */}
            <div className="grid grid-cols-[1fr_auto_1fr]">
              {benchSlots.map((slot) => {
                const userPlayer = getPlayerForSlot(userRoster, slot);
                const opponentPlayer = getPlayerForSlot(opponentRoster, slot);

                return (
                  <div key={slot} className="contents">
                    <MatchupPlayerRow
                      slot={slot}
                      playerName={userPlayer?.playerName || null}
                      playerPosition={userPlayer?.playerPosition || null}
                      playerTeam={userPlayer?.playerTeam || null}
                      playerId={userPlayer?.playerId || null}
                      side="left"
                    />
                    <div className="flex items-center justify-center px-2 border-b border-gray-100 bg-gray-50 min-w-[48px]">
                      <span className="text-xs font-bold text-gray-400">BN</span>
                    </div>
                    <MatchupPlayerRow
                      slot={slot}
                      playerName={opponentPlayer?.playerName || null}
                      playerPosition={opponentPlayer?.playerPosition || null}
                      playerTeam={opponentPlayer?.playerTeam || null}
                      playerId={opponentPlayer?.playerId || null}
                      side="right"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
