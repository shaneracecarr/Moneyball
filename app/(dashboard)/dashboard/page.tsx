import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserLeaguesAction } from "@/lib/actions/leagues";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
        <h1 className="text-3xl font-bold text-white">
          Welcome, {session.user.name || session.user.email}
        </h1>
        <p className="mt-2 text-gray-400">Select a league to manage your team, view matchups, and more.</p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">Your Leagues</h2>
        <div className="flex gap-3">
          <Link href="/leagues/join">
            <Button variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 bg-transparent">
              Join League
            </Button>
          </Link>
          <Link href="/leagues/create">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              Create League
            </Button>
          </Link>
        </div>
      </div>

      {leagues.length === 0 ? (
        <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">No Leagues Yet</h3>
            <p className="text-sm text-gray-400 mt-1">
              You haven&apos;t joined any leagues yet. Create your first league to get started!
            </p>
          </div>
          <div className="px-6 py-4 flex gap-3">
            <Link href="/leagues/create">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Create Your First League
              </Button>
            </Link>
            <Link href="/leagues/join">
              <Button variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 bg-transparent">
                Join a League
              </Button>
            </Link>
          </div>
        </div>
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

            // Determine status badge color based on phase (dark theme versions)
            const phaseColors: Record<string, string> = {
              setup: "bg-gray-500/20 text-gray-300",
              drafting: "bg-amber-500/20 text-amber-400",
              pre_week: "bg-green-500/20 text-green-400",
              week_active: "bg-blue-500/20 text-blue-400",
              complete: "bg-purple-500/20 text-purple-400",
            };
            const statusColor = phaseColors[league.phase] || "bg-gray-500/20 text-gray-300";

            return (
              <Link key={league.id} href={`/leagues/${league.id}`}>
                <div
                  className={`bg-[#252830] rounded-xl border transition-all cursor-pointer hover:bg-[#2a2f38] ${
                    isActive
                      ? "border-purple-500 shadow-lg shadow-purple-500/20"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <div className="px-5 py-4 border-b border-gray-700/50">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-white truncate">{league.name}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {league.isMock && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">
                            Mock
                          </span>
                        )}
                        {isActive && (
                          <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-medium">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {league.numberOfTeams} teams
                      {league.isCommissioner && " • Commissioner"}
                    </p>
                  </div>
                  <div className="px-5 py-4 space-y-2">
                    {league.teamName && (
                      <p className="text-sm text-gray-300">
                        Team: <span className="text-white font-medium">{league.teamName}</span>
                      </p>
                    )}
                    <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
