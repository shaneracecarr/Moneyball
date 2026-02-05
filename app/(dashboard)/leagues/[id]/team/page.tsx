import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserRosterAction } from "@/lib/actions/roster";
import { getLeagueDetailsAction } from "@/lib/actions/leagues";
import { getLeagueSettingsAction } from "@/lib/actions/settings";
import { getStandingsAction } from "@/lib/actions/standings";
import { generateSlotConfig } from "@/lib/roster-config";
import { TeamRosterPage } from "@/components/roster/team-roster-page";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TeamPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const leagueResult = await getLeagueDetailsAction(params.id);
  if (leagueResult.error || !leagueResult.league) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Error</h3>
            <p className="text-sm text-gray-400 mt-1">{leagueResult.error || "Failed to load league"}</p>
          </div>
          <div className="px-6 py-4">
            <Link href="/dashboard">
              <Button variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 bg-transparent">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const rosterResult = await getUserRosterAction(params.id);
  if (rosterResult.error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Error</h3>
            <p className="text-sm text-gray-400 mt-1">{rosterResult.error}</p>
          </div>
          <div className="px-6 py-4">
            <Link href={`/leagues/${params.id}`}>
              <Button variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 bg-transparent">
                Back to League
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [settingsResult, standingsResult] = await Promise.all([
    getLeagueSettingsAction(params.id),
    getStandingsAction(params.id),
  ]);

  const slotConfig = settingsResult.settings
    ? generateSlotConfig(settingsResult.settings)
    : undefined;

  const currentWeek = leagueResult.league.currentWeek || 1;

  // Find user's member ID to get their record
  const userMemberId = rosterResult.memberId;
  let teamRecord: { wins: number; losses: number; ties: number } | null = null;
  if (standingsResult && 'standings' in standingsResult && standingsResult.standings && userMemberId) {
    const standing = standingsResult.standings.find((s) => s.memberId === userMemberId);
    if (standing) {
      teamRecord = {
        wins: standing.wins,
        losses: standing.losses,
        ties: standing.ties,
      };
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{leagueResult.league.name}</h1>
        <p className="mt-2 text-gray-400">Manage your team roster</p>
      </div>

      <TeamRosterPage
        leagueId={params.id}
        starters={rosterResult.starters || []}
        bench={rosterResult.bench || []}
        ir={rosterResult.ir || []}
        teamName={rosterResult.teamName || null}
        slotConfig={slotConfig}
        currentWeek={currentWeek}
        teamRecord={teamRecord}
      />
    </div>
  );
}
