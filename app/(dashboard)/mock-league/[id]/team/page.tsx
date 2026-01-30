import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserRosterAction } from "@/lib/actions/roster";
import { getMockLeagueStateAction } from "@/lib/actions/mock-league";
import { getLeagueSettingsAction } from "@/lib/actions/settings";
import { generateSlotConfig } from "@/lib/roster-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamRosterPage } from "@/components/roster/team-roster-page";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function MockLeagueTeamPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const stateResult = await getMockLeagueStateAction(params.id);
  if (stateResult.error || !stateResult.league) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{stateResult.error || "Failed to load mock league"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/mock-league">
              <Button variant="outline">Back to Mock Leagues</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rosterResult = await getUserRosterAction(params.id);
  if (rosterResult.error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{rosterResult.error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/mock-league/${params.id}`}>
              <Button variant="outline">Back to League</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const settingsResult = await getLeagueSettingsAction(params.id);
  const slotConfig = settingsResult.settings
    ? generateSlotConfig(settingsResult.settings)
    : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/mock-league/${params.id}`}>
          <Button variant="outline" size="sm">
            ← Back to League
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {stateResult.league.name} - My Team
        </h1>
        {stateResult.league.currentWeek >= 1 && stateResult.league.currentWeek <= 17 && (
          <span className="text-sm text-gray-500">
            Week {stateResult.league.currentWeek}
          </span>
        )}
      </div>

      <TeamRosterPage
        leagueId={params.id}
        starters={rosterResult.starters || []}
        bench={rosterResult.bench || []}
        ir={rosterResult.ir || []}
        teamName={rosterResult.teamName || null}
        slotConfig={slotConfig}
      />
    </div>
  );
}
