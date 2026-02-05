import { auth, signOut } from "@/auth";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export async function Navbar() {
  const session = await auth();
  const activeLeagueId = cookies().get("active_league_id")?.value || null;
  const activeLeagueName = cookies().get("active_league_name")?.value || null;

  return (
    <nav className="border-b border-gray-700 bg-[#1e2128] w-full">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <h1 className="text-xl font-bold text-purple-400 cursor-pointer hover:text-purple-300">
                Moneyball
              </h1>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {activeLeagueId && (
                <>
                  <Link
                    href={`/leagues/${activeLeagueId}`}
                    className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors"
                  >
                    League
                  </Link>
                  <Link
                    href={`/leagues/${activeLeagueId}/team`}
                    className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors"
                  >
                    Team
                  </Link>
                  <Link
                    href={`/leagues/${activeLeagueId}/matchup`}
                    className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors"
                  >
                    Matchup
                  </Link>
                  <Link
                    href={`/leagues/${activeLeagueId}/standings`}
                    className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors"
                  >
                    Standings
                  </Link>
                  <Link
                    href={`/leagues/${activeLeagueId}/trades`}
                    className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors"
                  >
                    Trades
                  </Link>
                  <Link
                    href={`/leagues/${activeLeagueId}/inbox`}
                    className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors"
                  >
                    Inbox
                  </Link>
                  <Link
                    href={`/leagues/${activeLeagueId}/chat`}
                    className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors"
                  >
                    Chat
                  </Link>
                </>
              )}
              <Link
                href="/players"
                className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors"
              >
                Players
              </Link>
              <Link
                href="/mock-draft"
                className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors"
              >
                Mock Draft
              </Link>
              <Link
                href="/admin"
                className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeLeagueName && (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-md hover:bg-purple-500/30 transition-colors"
                title="Change league"
              >
                <span className="font-medium truncate max-w-[120px]">{activeLeagueName}</span>
                <span className="text-purple-400">&#x2715;</span>
              </Link>
            )}
            {session?.user?.email && (
              <span className="text-sm text-gray-400 hidden sm:inline">
                {session.user.email}
              </span>
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-transparent">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
