import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { searchPlayers, countPlayers, getPlayerCount, getLeagueOwnedPlayerIds } from "@/lib/db/queries";
import { PlayersTable } from "@/components/players/players-table";
import { PlayersFilters } from "@/components/players/players-filters";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 50;

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    position?: string;
    team?: string;
    page?: string;
    availability?: string;
    sort?: string;
  };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const search = searchParams.search || "";
  const position = searchParams.position || "";
  const team = searchParams.team || "";
  const page = parseInt(searchParams.page || "1");
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const availability = searchParams.availability || "all";
  const sort = (searchParams.sort as "adp" | "points" | "name") || "adp";

  // Get active league context from cookie
  const activeLeagueId = cookies().get("active_league_id")?.value || null;
  const activeLeagueName = cookies().get("active_league_name")?.value || null;

  // Get owned player IDs if in a league context
  let ownedPlayerIds: string[] = [];
  if (activeLeagueId) {
    try {
      ownedPlayerIds = await getLeagueOwnedPlayerIds(activeLeagueId);
    } catch {
      // Ignore — league may no longer exist
    }
  }

  // Build query options
  const showFreeAgentsOnly = availability === "free_agents" && !!activeLeagueId;

  const queryOptions = {
    search,
    position,
    team,
    sort,
    excludeInactive: true,
    excludeLeagueId: showFreeAgentsOnly ? activeLeagueId! : undefined,
  };

  // Get filtered players
  const players = await searchPlayers({
    ...queryOptions,
    limit: ITEMS_PER_PAGE,
    offset,
  });

  // Get total count for pagination
  const totalCount = await countPlayers(queryOptions);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Get total player count for display
  const totalPlayers = await getPlayerCount();

  // Build pagination URL params
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (position) params.set("position", position);
    if (team) params.set("team", team);
    if (availability !== "all") params.set("availability", availability);
    if (sort !== "adp") params.set("sort", sort);
    params.set("page", p.toString());
    return `/players?${params.toString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">NFL Players</h1>
          <p className="mt-2 text-gray-600">
            {totalCount} players{showFreeAgentsOnly ? " available" : ""} · {totalPlayers} total in database
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeLeagueName ? (
            <span className="text-sm text-gray-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
              League: <span className="font-medium text-indigo-700">{activeLeagueName}</span>
            </span>
          ) : (
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              No league selected — visit a league first
            </span>
          )}
          <Link href="/admin">
            <Button variant="outline" size="sm">
              Admin Panel
            </Button>
          </Link>
        </div>
      </div>

      <PlayersFilters
        currentSearch={search}
        currentPosition={position}
        currentTeam={team}
        currentAvailability={availability}
        currentSort={sort}
        hasActiveLeague={!!activeLeagueId}
      />

      <PlayersTable
        players={players}
        activeLeagueId={activeLeagueId}
        ownedPlayerIds={ownedPlayerIds}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages} · Showing {players.length} of {totalCount}{" "}
            players
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildPageUrl(page - 1)}>
                <Button variant="outline" size="sm">
                  Previous
                </Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildPageUrl(page + 1)}>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
