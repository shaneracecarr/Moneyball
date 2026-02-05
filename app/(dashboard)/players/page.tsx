import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { searchPlayersWithStats, countPlayers, getLeagueOwnedPlayerIds, type PlayerStatsSortField } from "@/lib/db/queries";
import { PlayersTable } from "@/components/players/players-table";
import { PlayersFilters } from "@/components/players/players-filters";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
    dir?: string;
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
  const sort = (searchParams.sort as PlayerStatsSortField) || "adp";
  const sortDir = (searchParams.dir as "asc" | "desc") || (sort === "adp" || sort === "name" ? "asc" : "desc");

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
    sortDir,
    excludeInactive: true,
    excludeLeagueId: showFreeAgentsOnly ? activeLeagueId! : undefined,
  };

  // Get filtered players with stats
  const players = await searchPlayersWithStats({
    ...queryOptions,
    limit: ITEMS_PER_PAGE,
    offset,
  });

  // Get total count for pagination
  const totalCount = await countPlayers({
    search,
    position,
    team,
    excludeInactive: true,
    excludeLeagueId: showFreeAgentsOnly ? activeLeagueId! : undefined,
  });
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Build pagination URL params
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (position) params.set("position", position);
    if (team) params.set("team", team);
    if (availability !== "all") params.set("availability", availability);
    if (sort !== "adp") params.set("sort", sort);
    if (sortDir !== "asc" && sort === "adp") params.set("dir", sortDir);
    if (sortDir !== "desc" && sort !== "adp" && sort !== "name") params.set("dir", sortDir);
    params.set("page", p.toString());
    return `/players?${params.toString()}`;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">NFL Players</h1>
        <div className="flex items-center gap-3">
          {activeLeagueName ? (
            <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1.5 rounded-lg">
              <span className="font-medium">{activeLeagueName}</span>
            </span>
          ) : (
            <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1.5 rounded-lg">
              No league selected
            </span>
          )}
        </div>
      </div>

      <PlayersFilters
        currentSearch={search}
        currentPosition={position}
        currentTeam={team}
        currentAvailability={availability}
        currentSort={sort}
        currentSortDir={sortDir}
        hasActiveLeague={!!activeLeagueId}
      />

      <PlayersTable
        players={players}
        activeLeagueId={activeLeagueId}
        ownedPlayerIds={ownedPlayerIds}
        currentSort={sort}
        currentSortDir={sortDir}
        currentPosition={position}
        currentSearch={search}
        currentTeam={team}
        currentAvailability={availability}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {page} of {totalPages} · Showing {players.length} of {totalCount.toLocaleString()}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildPageUrl(page - 1)}>
                <button className="px-3 py-1.5 text-sm bg-[#252830] border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
                  Previous
                </button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildPageUrl(page + 1)}>
                <button className="px-3 py-1.5 text-sm bg-[#252830] border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
                  Next
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
