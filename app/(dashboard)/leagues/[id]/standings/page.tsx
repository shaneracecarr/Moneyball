import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLeagueDetailsAction } from "@/lib/actions/leagues";
import { getStandingsAction } from "@/lib/actions/standings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function StandingsPage({ params }: { params: { id: string } }) {
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

  const standingsResult = await getStandingsAction(params.id);
  if (standingsResult.error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{standingsResult.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const standings = standingsResult.standings || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/leagues/${params.id}`}>
          <Button variant="outline" size="sm">
            ← Back to League
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{leagueResult.league.name} - Standings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
          <CardDescription>
            {standingsResult.completedWeeks
              ? "Season standings based on completed matchups."
              : "No matchups have been scored yet. Standings will update as games are completed."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 w-10">#</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Team</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600">Record</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-600">PF</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-600">PA</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, index) => (
                  <tr
                    key={team.memberId}
                    className={`border-b border-gray-100 last:border-b-0 ${
                      index < 6 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    <td className="py-3 px-3 text-gray-400 font-medium">{index + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-gray-900">{team.teamName}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {team.ties > 0
                        ? `${team.wins}-${team.losses}-${team.ties}`
                        : `${team.wins}-${team.losses}`}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-gray-700">
                      {team.pointsFor.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-gray-500">
                      {team.pointsAgainst.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
