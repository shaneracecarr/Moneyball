import { auth } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDraftStateAction } from "@/lib/actions/draft";
import { getLeagueSettings } from "@/lib/db/queries";
import { DraftBoard } from "@/components/draft/draft-board";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DraftPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const result = await getDraftStateAction(params.id);

  if (result.error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">{result.error}</p>
        <Link href={`/leagues/${params.id}`}>
          <Button variant="outline" className="mt-4">Back to League</Button>
        </Link>
      </div>
    );
  }

  if (!result.draft) {
    redirect(`/leagues/${params.id}`);
  }

  if (result.draft.status === "scheduled") {
    redirect(`/leagues/${params.id}`);
  }

  // Fetch league settings for draft timer
  const settings = await getLeagueSettings(params.id);

  // Build ordered members from draft order
  const orderedMembers = (result.order || [])
    .sort((a, b) => a.position - b.position)
    .map((o) => ({
      id: o.memberId,
      teamName: o.teamName,
      userName: o.userName || o.userEmail,
      userId: o.userId,
      isBot: o.isBot ?? false,
    }));

  return (
    <DraftBoard
      leagueId={params.id}
      initialState={{
        draft: result.draft,
        order: result.order!,
        picks: result.picks!,
        onTheClockMemberId: result.onTheClockMemberId,
        currentUserMemberId: result.currentUserMemberId,
        isCommissioner: result.isCommissioner!,
        numberOfTeams: result.numberOfTeams!,
      }}
      members={orderedMembers}
      draftTimerSeconds={settings.draftTimerSeconds}
    />
  );
}
