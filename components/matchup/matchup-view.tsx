"use client";

import { useState, useTransition } from "react";
import { getMatchupAction, getWeekMatchupsAction, getSpecificMatchupAction } from "@/lib/actions/matchups";
import { MatchupPlayerRow } from "./matchup-player-row";
import { PlayerNameLink } from "@/components/player-card/player-name-link";

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

type WeekMatchup = {
  id: string;
  week: number;
  team1MemberId: string;
  team2MemberId: string;
  team1Score: number | null;
  team2Score: number | null;
  team1Name: string;
  team2Name: string;
};

type TeamRecord = {
  wins: number;
  losses: number;
  ties: number;
};

interface MatchupViewProps {
  leagueId: string;
  leagueName: string;
  initialWeek: number;
  currentWeek: number;
  initialUserRoster: RosterPlayer[];
  initialOpponentRoster: RosterPlayer[];
  initialUserTeam: TeamInfo | null;
  initialOpponentTeam: TeamInfo | null;
  initialUserScore: number | null;
  initialOpponentScore: number | null;
  hasMatchup: boolean;
  starterSlots: string[];
  benchSlots: string[];
  slotLabels: Record<string, string>;
  teamRecords: Record<string, TeamRecord>;
  weekMatchups: WeekMatchup[];
  currentUserMemberId: string | null;
}

// Faux "played" status - in future this will come from real game data
const TEAMS_PLAYED_THIS_WEEK = new Set(["BUF", "NYG", "KC", "LV"]);

function getPlayerForSlot(roster: RosterPlayer[], slot: string) {
  return roster.find((r) => r.slot === slot) || null;
}

function TeamInitial({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xl">
      {initial}
    </div>
  );
}

function formatScore(score: number | null): string {
  return score !== null ? score.toFixed(1) : "0.0";
}

function formatRecord(record: TeamRecord | undefined): string {
  if (!record) return "0-0";
  const { wins, losses, ties } = record;
  if (ties > 0) return `${wins}-${losses}-${ties}`;
  return `${wins}-${losses}`;
}

const POSITION_COLORS: Record<string, string> = {
  QB: "bg-red-500/20 text-red-400 border-red-500/30",
  RB: "bg-green-500/20 text-green-400 border-green-500/30",
  WR: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  TE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  K: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DEF: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  FLEX: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BN: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function MatchupView({
  leagueId,
  leagueName,
  initialWeek,
  currentWeek,
  initialUserRoster,
  initialOpponentRoster,
  initialUserTeam,
  initialOpponentTeam,
  initialUserScore,
  initialOpponentScore,
  hasMatchup,
  starterSlots,
  benchSlots,
  slotLabels,
  teamRecords,
  weekMatchups: initialWeekMatchups,
  currentUserMemberId,
}: MatchupViewProps) {
  const [week, setWeek] = useState(initialWeek);
  const [team1Roster, setTeam1Roster] = useState(initialUserRoster);
  const [team2Roster, setTeam2Roster] = useState(initialOpponentRoster);
  const [team1, setTeam1] = useState(initialUserTeam);
  const [team2, setTeam2] = useState(initialOpponentTeam);
  const [team1Score, setTeam1Score] = useState(initialUserScore);
  const [team2Score, setTeam2Score] = useState(initialOpponentScore);
  const [hasData, setHasData] = useState(hasMatchup);
  const [isPending, startTransition] = useTransition();
  const [weekMatchups, setWeekMatchups] = useState(initialWeekMatchups);
  const [selectedMatchupId, setSelectedMatchupId] = useState<string | null>(null);

  // Find current user's matchup ID
  const userMatchup = weekMatchups.find(
    (m) => m.team1MemberId === currentUserMemberId || m.team2MemberId === currentUserMemberId
  );

  const changeWeek = (newWeek: number) => {
    if (newWeek < 1 || newWeek > 17) return;
    setWeek(newWeek);
    setSelectedMatchupId(null);

    startTransition(async () => {
      const [matchResult, weekResult] = await Promise.all([
        getMatchupAction(leagueId, newWeek),
        getWeekMatchupsAction(leagueId, newWeek),
      ]);

      if (weekResult && 'matchups' in weekResult && weekResult.matchups) {
        setWeekMatchups(weekResult.matchups);
      }

      if (matchResult.error || !matchResult.matchup) {
        setHasData(false);
        setTeam1Roster([]);
        setTeam2Roster([]);
        setTeam1(null);
        setTeam2(null);
        setTeam1Score(null);
        setTeam2Score(null);
        return;
      }

      setHasData(true);
      setTeam1Roster(matchResult.userRoster || []);
      setTeam2Roster(matchResult.opponentRoster || []);
      setTeam1(matchResult.userTeam || null);
      setTeam2(matchResult.opponentTeam || null);

      const matchup = matchResult.matchup;
      const isTeam1 = matchup.team1MemberId === matchResult.userTeam?.memberId;
      setTeam1Score(isTeam1 ? matchup.team1Score : matchup.team2Score);
      setTeam2Score(isTeam1 ? matchup.team2Score : matchup.team1Score);
    });
  };

  const selectMatchup = (matchupId: string) => {
    setSelectedMatchupId(matchupId);

    startTransition(async () => {
      const result = await getSpecificMatchupAction(leagueId, week, matchupId);

      if (result.error || !result.matchup) {
        return;
      }

      setHasData(true);
      setTeam1Roster(result.team1Roster || []);
      setTeam2Roster(result.team2Roster || []);
      setTeam1(result.team1 || null);
      setTeam2(result.team2 || null);
      setTeam1Score(result.matchup.team1Score);
      setTeam2Score(result.matchup.team2Score);
    });
  };

  const team1Name = team1?.teamName || team1?.userName || "Team 1";
  const team2Name = team2?.teamName || team2?.userName || "Team 2";
  const team1Record = team1?.memberId ? teamRecords[team1.memberId] : undefined;
  const team2Record = team2?.memberId ? teamRecords[team2.memberId] : undefined;

  // Calculate projected points (placeholder: 11 per player in starters)
  const team1Projected = starterSlots.reduce((sum, slot) => {
    const player = getPlayerForSlot(team1Roster, slot);
    return sum + (player ? 11 : 0);
  }, 0);
  const team2Projected = starterSlots.reduce((sum, slot) => {
    const player = getPlayerForSlot(team2Roster, slot);
    return sum + (player ? 11 : 0);
  }, 0);

  // Yet to play players (starters only)
  const team1YetToPlay = starterSlots
    .map((slot) => getPlayerForSlot(team1Roster, slot))
    .filter((p) => p && !TEAMS_PLAYED_THIS_WEEK.has(p.playerTeam || ""));
  const team2YetToPlay = starterSlots
    .map((slot) => getPlayerForSlot(team2Roster, slot))
    .filter((p) => p && !TEAMS_PLAYED_THIS_WEEK.has(p.playerTeam || ""));

  return (
    <div className="space-y-6">
      {/* Header with League Name and Week Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{leagueName} - Matchup</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Week:</span>
          <select
            value={week}
            onChange={(e) => changeWeek(Number(e.target.value))}
            disabled={isPending}
            className="bg-[#1a1d24] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
          >
            {Array.from({ length: 17 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Week {w} {w === currentWeek ? "(Current)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Matchup Selector Dropdown */}
      {weekMatchups.length > 0 && (
        <div className="bg-[#252830] rounded-xl border border-gray-700 p-4">
          <label className="block text-sm text-gray-400 mb-2">View Matchup:</label>
          <select
            value={selectedMatchupId || userMatchup?.id || ""}
            onChange={(e) => {
              if (e.target.value) selectMatchup(e.target.value);
            }}
            disabled={isPending}
            className="w-full bg-[#1a1d24] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
          >
            {weekMatchups.map((m) => {
              const isUserMatchup = m.team1MemberId === currentUserMemberId || m.team2MemberId === currentUserMemberId;
              return (
                <option key={m.id} value={m.id}>
                  {m.team1Name} vs {m.team2Name} {isUserMatchup ? "(Your Matchup)" : ""}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {!hasData ? (
        <div className="bg-[#252830] rounded-xl border border-gray-700 p-12 text-center">
          <p className="text-lg text-white">No matchup this week</p>
          <p className="text-sm text-gray-400 mt-2">
            The schedule may not have been generated yet.
          </p>
        </div>
      ) : (
        <>
          {/* Score Banner */}
          <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
            {/* Win Probability Bar */}
            <div className="h-2 flex">
              <div className="bg-purple-600 transition-all duration-500" style={{ width: "50%" }} />
              <div className="bg-gray-600 transition-all duration-500" style={{ width: "50%" }} />
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center justify-between">
                {/* Team 1 */}
                <div className="flex items-center gap-4">
                  <TeamInitial name={team1Name} />
                  <div className="text-left">
                    <p className="text-white font-semibold text-lg truncate max-w-[160px]">
                      {team1Name}
                    </p>
                    <p className="text-sm text-gray-400">{formatRecord(team1Record)}</p>
                  </div>
                </div>

                {/* Score Display */}
                <div className="text-center px-4">
                  <p className="text-4xl font-bold text-white tabular-nums">
                    {formatScore(team1Score)}{" "}
                    <span className="text-gray-500 mx-2">-</span>{" "}
                    {formatScore(team2Score)}
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-1">
                    <span className="text-xs text-gray-500">Proj: {team1Projected.toFixed(1)}</span>
                    <span className="text-xs text-purple-400">50% - 50%</span>
                    <span className="text-xs text-gray-500">Proj: {team2Projected.toFixed(1)}</span>
                  </div>
                </div>

                {/* Team 2 */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white font-semibold text-lg truncate max-w-[160px]">
                      {team2Name}
                    </p>
                    <p className="text-sm text-gray-400">{formatRecord(team2Record)}</p>
                  </div>
                  <TeamInitial name={team2Name} />
                </div>
              </div>
            </div>
          </div>

          {/* Yet To Play Section */}
          <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Yet To Play</h3>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-700">
              {/* Team 1 Yet To Play */}
              <div className="px-4 py-3">
                <p className="text-xs text-gray-500 mb-2">{team1Name}</p>
                {team1YetToPlay.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">All players have played</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {team1YetToPlay.map((player) => player && (
                      <span
                        key={player.id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1a1d24] border border-gray-700"
                      >
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${POSITION_COLORS[player.playerPosition] || POSITION_COLORS.BN}`}>
                          {player.playerPosition}
                        </span>
                        <PlayerNameLink
                          playerId={player.playerId}
                          playerName={player.playerName.split(" ").pop() || player.playerName}
                          className="text-xs text-white hover:text-purple-400"
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Team 2 Yet To Play */}
              <div className="px-4 py-3">
                <p className="text-xs text-gray-500 mb-2">{team2Name}</p>
                {team2YetToPlay.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">All players have played</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {team2YetToPlay.map((player) => player && (
                      <span
                        key={player.id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1a1d24] border border-gray-700"
                      >
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${POSITION_COLORS[player.playerPosition] || POSITION_COLORS.BN}`}>
                          {player.playerPosition}
                        </span>
                        <PlayerNameLink
                          playerId={player.playerId}
                          playerName={player.playerName.split(" ").pop() || player.playerName}
                          className="text-xs text-white hover:text-purple-400"
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Roster Comparison */}
          <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
            {/* Starters Header */}
            <div className="px-6 py-3 border-b border-gray-700 bg-[#1e2128]">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Starters
              </p>
            </div>

            {/* Starters Grid */}
            <div className="divide-y divide-gray-700/50">
              {starterSlots.map((slot) => {
                const team1Player = getPlayerForSlot(team1Roster, slot);
                const team2Player = getPlayerForSlot(team2Roster, slot);
                const slotLabel = slotLabels[slot] || slot.replace(/\d+$/, "");

                return (
                  <div key={slot} className="grid grid-cols-[1fr_auto_1fr]">
                    {/* Left - Team 1 */}
                    <MatchupPlayerRow
                      slot={slot}
                      playerName={team1Player?.playerName || null}
                      playerPosition={team1Player?.playerPosition || null}
                      playerTeam={team1Player?.playerTeam || null}
                      playerId={team1Player?.playerId || null}
                      side="left"
                      hasPlayed={team1Player ? TEAMS_PLAYED_THIS_WEEK.has(team1Player.playerTeam || "") : false}
                    />
                    {/* Slot Label */}
                    <div className="flex items-center justify-center px-3 bg-[#1a1d24] min-w-[56px]">
                      <span className={`text-xs font-bold px-2 py-1 rounded border ${POSITION_COLORS[slotLabel] || POSITION_COLORS.BN}`}>
                        {slotLabel}
                      </span>
                    </div>
                    {/* Right - Team 2 */}
                    <MatchupPlayerRow
                      slot={slot}
                      playerName={team2Player?.playerName || null}
                      playerPosition={team2Player?.playerPosition || null}
                      playerTeam={team2Player?.playerTeam || null}
                      playerId={team2Player?.playerId || null}
                      side="right"
                      hasPlayed={team2Player ? TEAMS_PLAYED_THIS_WEEK.has(team2Player.playerTeam || "") : false}
                    />
                  </div>
                );
              })}
            </div>

            {/* Bench Header */}
            <div className="px-6 py-3 border-t border-b border-gray-700 bg-[#1e2128]">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Bench
              </p>
            </div>

            {/* Bench Grid */}
            <div className="divide-y divide-gray-700/50">
              {benchSlots.map((slot) => {
                const team1Player = getPlayerForSlot(team1Roster, slot);
                const team2Player = getPlayerForSlot(team2Roster, slot);

                return (
                  <div key={slot} className="grid grid-cols-[1fr_auto_1fr]">
                    <MatchupPlayerRow
                      slot={slot}
                      playerName={team1Player?.playerName || null}
                      playerPosition={team1Player?.playerPosition || null}
                      playerTeam={team1Player?.playerTeam || null}
                      playerId={team1Player?.playerId || null}
                      side="left"
                      hasPlayed={team1Player ? TEAMS_PLAYED_THIS_WEEK.has(team1Player.playerTeam || "") : false}
                    />
                    <div className="flex items-center justify-center px-3 bg-[#1a1d24] min-w-[56px]">
                      <span className={`text-xs font-bold px-2 py-1 rounded border ${POSITION_COLORS.BN}`}>
                        BN
                      </span>
                    </div>
                    <MatchupPlayerRow
                      slot={slot}
                      playerName={team2Player?.playerName || null}
                      playerPosition={team2Player?.playerPosition || null}
                      playerTeam={team2Player?.playerTeam || null}
                      playerId={team2Player?.playerId || null}
                      side="right"
                      hasPlayed={team2Player ? TEAMS_PLAYED_THIS_WEEK.has(team2Player.playerTeam || "") : false}
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
