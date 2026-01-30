import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLeagueDetailsAction } from "@/lib/actions/leagues";
import { getChatMessagesAction } from "@/lib/actions/chat";
import { setActiveLeagueAction } from "@/lib/actions/roster";
import { SetActiveLeague } from "@/components/leagues/set-active-league";
import { ChatRoom } from "@/components/chat/chat-room";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ChatPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const leagueResult = await getLeagueDetailsAction(params.id);

  if (leagueResult.error || !leagueResult.league) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  const { league, members } = leagueResult;
  const currentMember = members?.find((m) => m.userId === session.user.id);

  if (!currentMember) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You are not a member of this league.</CardDescription>
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

  const chatResult = await getChatMessagesAction(params.id);
  const initialMessages = chatResult.messages || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SetActiveLeague leagueId={league.id} leagueName={league.name} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{league.name} Chat</h1>
          <p className="text-sm text-gray-500 mt-1">
            League chat room for all members
          </p>
        </div>
        <Link href={`/leagues/${league.id}`}>
          <Button variant="outline" size="sm">Back to League</Button>
        </Link>
      </div>

      <ChatRoom
        leagueId={league.id}
        currentMemberId={currentMember.id}
        currentTeamName={currentMember.teamName || session.user.email || "Unknown"}
        initialMessages={initialMessages}
      />
    </div>
  );
}
