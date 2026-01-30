import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserRosterAction } from "@/lib/actions/roster";
import { getLeagueDetailsAction } from "@/lib/actions/leagues";
import { getLeagueSettingsAction } from "@/lib/actions/settings";
import { generateSlotConfig } from "@/lib/roster-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
            <Link href={`/leagues/${params.id}`}>
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
        <Link href={`/leagues/${params.id}`}>
          <Button variant="outline" size="sm">
            ← Back to League
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{leagueResult.league.name} - My Team</h1>
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
