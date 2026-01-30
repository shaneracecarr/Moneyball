import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLeagueDetailsAction } from "@/lib/actions/leagues";
import { getMatchupAction } from "@/lib/actions/matchups";
import { getLeagueSettingsAction } from "@/lib/actions/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchupView } from "@/components/matchup/matchup-view";
import { generateSlotConfig } from "@/lib/roster-config";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{leagueResult.error || "Failed to load league"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
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

  const matchupResult = await getMatchupAction(params.id, clampedWeek);

  // Get slot config from league settings
  const settingsResult = await getLeagueSettingsAction(params.id);
  const settings = settingsResult.settings;
  const slotConfig = settings ? generateSlotConfig(settings) : null;

  const starterSlots = slotConfig?.starterSlots || ["QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX", "K", "DEF"];
  const benchSlots = slotConfig?.benchSlots || ["BN1", "BN2", "BN3", "BN4", "BN5", "BN6", "BN7"];

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/leagues/${params.id}`}>
          <Button variant="outline" size="sm">
            ← Back to League
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{league.name} - Matchup</h1>
      </div>

      <MatchupView
        leagueId={params.id}
        initialWeek={clampedWeek}
        initialUserRoster={matchupResult.userRoster || []}
        initialOpponentRoster={matchupResult.opponentRoster || []}
        initialUserTeam={matchupResult.userTeam || null}
        initialOpponentTeam={matchupResult.opponentTeam || null}
        initialUserScore={userScore ?? null}
        initialOpponentScore={opponentScore ?? null}
        hasMatchup={!!matchupResult.matchup}
        starterSlots={starterSlots}
        benchSlots={benchSlots}
      />
    </div>
  );
}
