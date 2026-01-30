import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLeagueDetailsAction } from "@/lib/actions/leagues";
import { getInboxDataAction } from "@/lib/actions/trades";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InboxList } from "@/components/trades/inbox-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function InboxPage({ params }: { params: { id: string } }) {
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

  const inboxResult = await getInboxDataAction(params.id);
  if (inboxResult.error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{inboxResult.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/leagues/${params.id}`}>
          <Button variant="outline" size="sm">
            ← Back to League
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{leagueResult.league.name} - Inbox</h1>
      </div>

      <InboxList
        trades={(inboxResult.trades || []) as any}
        currentMemberId={inboxResult.currentMemberId!}
        leagueId={params.id}
      />
    </div>
  );
}
