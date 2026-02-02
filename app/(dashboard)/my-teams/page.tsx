import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserLeaguesAction } from "@/lib/actions/leagues";
import { getUserRosterAction } from "@/lib/actions/roster";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MyTeamsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { leagues } = await getUserLeaguesAction();

  const leagueRosters = await Promise.all(
    (leagues || []).map(async (league) => {
      const roster = await getUserRosterAction(league.id);
      return {
        league,
        rosterCount:
          (roster.starters?.length || 0) +
          (roster.bench?.length || 0) +
          (roster.ir?.length || 0),
        teamName: roster.teamName,
        hasRoster: !roster.error && (roster.starters?.length || 0) > 0,
      };
    })
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Teams</h1>
        <p className="mt-2 text-gray-600">View and manage your rosters across all leagues</p>
      </div>

      {leagueRosters.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Leagues Yet</CardTitle>
            <CardDescription>
              Join or create a league to start building your team.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href="/leagues/create">
              <Button>Create League</Button>
            </Link>
            <Link href="/leagues/join">
              <Button variant="outline">Join League</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagueRosters.map(({ league, rosterCount, teamName, hasRoster }) => (
            <Card key={league.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{league.name}</CardTitle>
                <CardDescription>
                  {teamName || "No team name"}
                  {league.isCommissioner && " · Commissioner"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    {hasRoster
                      ? `${rosterCount}/18 roster spots filled`
                      : "No roster yet — complete your draft first"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/leagues/${league.id}/team`}>
                    <Button size="sm" disabled={!hasRoster}>
                      {hasRoster ? "Manage Roster" : "View Team"}
                    </Button>
                  </Link>
                  <Link href={`/leagues/${league.id}`}>
                    <Button variant="outline" size="sm">
                      League Home
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
