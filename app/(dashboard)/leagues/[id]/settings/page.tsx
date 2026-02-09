import { auth } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLeagueDetailsAction } from "@/lib/actions/leagues";
import { getLeagueSettingsAction } from "@/lib/actions/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeagueSettingsForm } from "@/components/leagues/league-settings-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function LeagueSettingsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const leagueResult = await getLeagueDetailsAction(params.id);
  if (leagueResult.error || !leagueResult.league || !leagueResult.members) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  const settingsResult = await getLeagueSettingsAction(params.id);
  if (settingsResult.error || !settingsResult.settings) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{settingsResult.error || "Failed to load settings"}</CardDescription>
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

  const { league, members } = leagueResult;
  const currentMember = members.find((m) => m.userId === session.user.id);
  const isCommissioner = currentMember?.isCommissioner ?? false;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/leagues/${params.id}`}>
          <Button variant="outline" size="sm">
            ← Back to League
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{league.name} - Settings</h1>
      </div>

      {!isCommissioner && (
        <div className="mb-6 bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded-lg text-sm">
          You are viewing league settings. Only the commissioner can make changes.
        </div>
      )}

      <LeagueSettingsForm
        leagueId={params.id}
        settings={settingsResult.settings}
        isCommissioner={isCommissioner}
        locked={settingsResult.locked ?? false}
        isMock={league.isMock ?? false}
      />
    </div>
  );
}
