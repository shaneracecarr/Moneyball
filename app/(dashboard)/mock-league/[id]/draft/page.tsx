import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMockLeagueStateAction } from "@/lib/actions/mock-league";
import { MockLeagueDraft } from "@/components/mock-league/mock-league-draft";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function MockLeagueDraftPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const result = await getMockLeagueStateAction(params.id);

  if (result.error || !result.league || !result.draft) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{result.error || "Draft not found"}</CardDescription>
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

  if (result.draft.status === "completed") {
    redirect(`/mock-league/${params.id}`);
  }

  if (result.draft.status !== "in_progress") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Draft Not Started</CardTitle>
            <CardDescription>The draft hasn&apos;t started yet.</CardDescription>
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

  // Order members by their draft position
  const draftOrder = result.draftOrder || [];
  const memberMap = new Map((result.members || []).map((m: any) => [m.id, m]));
  const orderedMembers = draftOrder
    .sort((a: any, b: any) => a.position - b.position)
    .map((o: any) => {
      const m = memberMap.get(o.memberId);
      return m
        ? { id: m.id, teamName: m.teamName, userName: m.userName, isBot: m.isBot, userId: m.userId }
        : null;
    })
    .filter(Boolean) as { id: string; teamName: string | null; userName: string | null; isBot: boolean; userId: string | null }[];

  // Fallback if draft order is empty
  const members = orderedMembers.length > 0
    ? orderedMembers
    : (result.members || []).map((m: any) => ({
        id: m.id,
        teamName: m.teamName,
        userName: m.userName,
        isBot: m.isBot,
        userId: m.userId,
      }));

  const initialPicks = (result.draftPicks || []).map((p: any) => ({
    pickNumber: p.pickNumber,
    round: p.round,
    playerName: p.playerName,
    playerPosition: p.playerPosition,
    playerTeam: p.playerTeam,
    memberId: p.memberId,
    teamName: p.teamName,
  }));

  return (
    <MockLeagueDraft
      leagueId={params.id}
      draftId={result.draft.id}
      currentPick={result.draft.currentPick}
      numberOfTeams={result.league.numberOfTeams}
      numberOfRounds={result.draft.numberOfRounds}
      members={members}
      onTheClockMemberId={result.onTheClockMemberId}
      currentUserMemberId={result.currentUserMemberId!}
      initialPicks={initialPicks}
    />
  );
}
