import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserMockLeaguesAction } from "@/lib/actions/mock-league";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MockLeaguePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { leagues } = await getUserMockLeaguesAction();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mock Leagues</h1>
        <p className="mt-2 text-gray-600">
          Play full fantasy seasons against AI opponents. Draft, manage your roster, and compete across 17 weeks.
        </p>
      </div>

      <div className="mb-6">
        <Link href="/mock-league/create">
          <Button>Create Mock League</Button>
        </Link>
      </div>

      {leagues.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Mock Leagues</CardTitle>
            <CardDescription>
              Create your first mock league to play a full season against AI teams.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/mock-league/create">
              <Button>Create Your First Mock League</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map((league) => {
            const statusLabel =
              league.draftStatus === "in_progress"
                ? "Drafting"
                : league.currentWeek > 17
                ? "Season Complete"
                : league.currentWeek >= 1
                ? `Week ${league.currentWeek}`
                : "Setting Up";

            const statusColor =
              league.draftStatus === "in_progress"
                ? "bg-yellow-100 text-yellow-800"
                : league.currentWeek > 17
                ? "bg-green-100 text-green-800"
                : league.currentWeek >= 1
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-800";

            return (
              <Link key={league.id} href={`/mock-league/${league.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{league.name}</CardTitle>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <CardDescription>
                      {league.numberOfTeams} teams
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
