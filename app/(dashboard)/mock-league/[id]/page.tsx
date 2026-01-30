import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMockLeagueStateAction } from "@/lib/actions/mock-league";
import { MockLeagueHub } from "@/components/mock-league/mock-league-hub";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function MockLeagueDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const result = await getMockLeagueStateAction(params.id);

  if (result.error || !result.league) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{result.error || "Failed to load mock league"}</CardDescription>
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

  // If draft is in progress, redirect to draft page
  if (result.draft?.status === "in_progress") {
    redirect(`/mock-league/${params.id}/draft`);
  }

  return (
    <MockLeagueHub
      leagueId={result.league.id}
      leagueName={result.league.name}
      currentWeek={result.league.currentWeek}
      numberOfTeams={result.league.numberOfTeams}
      draftStatus={result.draft?.status || "scheduled"}
      standings={result.standings || []}
    />
  );
}
