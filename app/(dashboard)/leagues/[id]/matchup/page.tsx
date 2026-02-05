import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLeagueDetailsAction } from "@/lib/actions/leagues";
import { getMatchupAction, getWeekMatchupsAction } from "@/lib/actions/matchups";
import { getStandingsAction } from "@/lib/actions/standings";
import { getLeagueSettingsAction } from "@/lib/actions/settings";
import { MatchupView } from "@/components/matchup/matchup-view";
import { generateSlotConfig } from "@/lib/roster-config";

export default async function MatchupPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { week?: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const leagueResult = await getLeagueDetailsAction(params.id);
  if (leagueResult.error || !leagueResult.league) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#252830] rounded-xl border border-gray-700 p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-gray-400">{leagueResult.error || "Failed to load league"}</p>
        </div>
      </div>
    );
  }

  const league = leagueResult.league;

  // Default to current week if the league is in-season
  const defaultWeek = league.currentWeek >= 1 && league.currentWeek <= 17
    ? league.currentWeek
    : league.currentWeek > 17
      ? 17
      : 1;
  const week = searchParams.week ? parseInt(searchParams.week, 10) : defaultWeek;
  const clampedWeek = Math.max(1, Math.min(17, isNaN(week) ? 1 : week));

  // Fetch all data in parallel
  const [matchupResult, weekMatchupsResult, standingsResult, settingsResult] = await Promise.all([
    getMatchupAction(params.id, clampedWeek),
    getWeekMatchupsAction(params.id, clampedWeek),
    getStandingsAction(params.id),
    getLeagueSettingsAction(params.id),
  ]);

  // Get slot config from league settings
  const settings = settingsResult.settings;
  const slotConfig = settings ? generateSlotConfig(settings) : null;

  const starterSlots = slotConfig?.starterSlots || ["QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX", "K", "DEF"];
  const benchSlots = slotConfig?.benchSlots || ["BN1", "BN2", "BN3", "BN4", "BN5", "BN6", "BN7"];
  const slotLabels = slotConfig?.slotLabels || {};

  // Extract scores from matchup
  const matchup = matchupResult.matchup;
  const isTeam1 = matchup
    ? matchup.team1MemberId === (leagueResult.members?.find(m => m.userId === session.user.id)?.id)
    : true;

  const userScore = matchup
    ? (isTeam1 ? matchup.team1Score : matchup.team2Score)
    : null;
  const opponentScore = matchup
    ? (isTeam1 ? matchup.team2Score : matchup.team1Score)
    : null;

  // Build team records map for client
  const teamRecords: Record<string, { wins: number; losses: number; ties: number }> = {};
  if (standingsResult && 'standings' in standingsResult && standingsResult.standings) {
    for (const standing of standingsResult.standings) {
      teamRecords[standing.memberId] = {
        wins: standing.wins,
        losses: standing.losses,
        ties: standing.ties,
      };
    }
  }

  // Get all week matchups for dropdown
  const weekMatchups = (weekMatchupsResult && 'matchups' in weekMatchupsResult && weekMatchupsResult.matchups)
    ? weekMatchupsResult.matchups
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <MatchupView
        leagueId={params.id}
        leagueName={league.name}
        initialWeek={clampedWeek}
        currentWeek={league.currentWeek}
        initialUserRoster={matchupResult.userRoster || []}
        initialOpponentRoster={matchupResult.opponentRoster || []}
        initialUserTeam={matchupResult.userTeam || null}
        initialOpponentTeam={matchupResult.opponentTeam || null}
        initialUserScore={userScore ?? null}
        initialOpponentScore={opponentScore ?? null}
        hasMatchup={!!matchupResult.matchup}
        starterSlots={starterSlots}
        benchSlots={benchSlots}
        slotLabels={slotLabels}
        teamRecords={teamRecords}
        weekMatchups={weekMatchups}
        currentUserMemberId={leagueResult.members?.find(m => m.userId === session.user.id)?.id || null}
      />
    </div>
  );
}
