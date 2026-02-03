import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MockDraftBoard } from "@/components/mock-draft/mock-draft-board";
import { getAllPlayersAction } from "@/lib/actions/mock-draft";

export const dynamic = "force-dynamic";

export default async function MockDraftPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { players } = await getAllPlayersAction();
  return <MockDraftBoard allPlayers={players} />;
}
