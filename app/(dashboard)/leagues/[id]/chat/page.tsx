import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLeagueDetailsAction } from "@/lib/actions/leagues";
import { getChatMessagesAction } from "@/lib/actions/chat";
import { setActiveLeagueAction } from "@/lib/actions/roster";
import { SetActiveLeague } from "@/components/leagues/set-active-league";
import { ChatRoom } from "@/components/chat/chat-room";

export default async function ChatPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const leagueResult = await getLeagueDetailsAction(params.id);

  if (leagueResult.error || !leagueResult.league) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#252830] rounded-xl border border-gray-700 p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-gray-400">{leagueResult.error || "Failed to load league"}</p>
        </div>
      </div>
    );
  }

  const { league, members } = leagueResult;
  const currentMember = members?.find((m) => m.userId === session.user.id);

  if (!currentMember) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#252830] rounded-xl border border-gray-700 p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You are not a member of this league.</p>
        </div>
      </div>
    );
  }

  const chatResult = await getChatMessagesAction(params.id);
  const initialMessages = chatResult.messages || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SetActiveLeague leagueId={league.id} leagueName={league.name} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{league.name} - Chat</h1>
        <p className="text-sm text-gray-400 mt-1">
          League chat room for all members
        </p>
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
