import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserLeaguesAction } from "@/lib/actions/leagues";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { leagues } = await getUserLeaguesAction();
  const activeLeagueId = cookies().get("active_league_id")?.value || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {session.user.name || session.user.email}
        </h1>
        <p className="mt-2 text-gray-600">Select a league to manage your team, view matchups, and more.</p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Your Leagues</h2>
        <div className="flex gap-3">
          <Link href="/leagues/join">
            <Button variant="outline">Join League</Button>
          </Link>
          <Link href="/leagues/create">
            <Button>Create League</Button>
          </Link>
        </div>
      </div>

      {leagues.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Leagues Yet</CardTitle>
            <CardDescription>
              You haven&apos;t joined any leagues yet. Create your first league to get started!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href="/leagues/create">
              <Button>Create Your First League</Button>
            </Link>
            <Link href="/leagues/join">
              <Button variant="outline">Join a League</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map((league) => {
            const isActive = league.id === activeLeagueId;

            // Determine status label based on phase
            const phaseLabels: Record<string, string> = {
              setup: "Setting Up",
              drafting: "Drafting",
              pre_week: `Week ${league.currentWeek} (Pre-Week)`,
              week_active: `Week ${league.currentWeek}`,
              complete: "Season Complete",
            };
            const statusLabel = phaseLabels[league.phase] || "Setting Up";

            // Determine status badge color based on phase
            const phaseColors: Record<string, string> = {
              setup: "bg-gray-100 text-gray-700",
              drafting: "bg-amber-100 text-amber-700",
              pre_week: "bg-green-100 text-green-700",
              week_active: "bg-blue-100 text-blue-700",
              complete: "bg-indigo-100 text-indigo-700",
            };
            const statusColor = phaseColors[league.phase] || "bg-gray-100 text-gray-700";

            return (
              <Link key={league.id} href={`/leagues/${league.id}`}>
                <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${isActive ? "ring-2 ring-indigo-500 shadow-md" : ""
                  }`}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="truncate">{league.name}</CardTitle>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {league.isMock && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                            Mock
                          </span>
                        )}
                        {isActive && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {league.numberOfTeams} teams
                      {league.isCommissioner && " • Commissioner"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {league.teamName && (
                      <p className="text-sm text-gray-600">
                        Team: {league.teamName}
                      </p>
                    )}
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
