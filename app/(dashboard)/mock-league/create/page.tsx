import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MockLeagueSetup } from "@/components/mock-league/mock-league-setup";

export default async function CreateMockLeaguePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <MockLeagueSetup />
    </div>
  );
}
