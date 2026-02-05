import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLeagueDetailsAction } from "@/lib/actions/leagues";
import { getStandingsAction } from "@/lib/actions/standings";

export default async function StandingsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const leagueResult = await getLeagueDetailsAction(params.id);
  if (leagueResult.error || !leagueResult.league) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#252830] rounded-xl border border-gray-700 p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-gray-400">{leagueResult.error || "Failed to load league"}</p>
        </div>
      </div>
    );
  }

  const standingsResult = await getStandingsAction(params.id);
  if (standingsResult.error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#252830] rounded-xl border border-gray-700 p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-gray-400">{standingsResult.error}</p>
        </div>
      </div>
    );
  }

  const standings = standingsResult.standings || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{leagueResult.league.name} - Standings</h1>
        <p className="text-sm text-gray-400 mt-1">
          {standingsResult.completedWeeks
            ? `Through Week ${standingsResult.completedWeeks}`
            : "No matchups scored yet"}
        </p>
      </div>

      {/* Standings Table */}
      <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 bg-[#1e2128]">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide w-12">
                Rank
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Team
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide w-24">
                Record
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide w-20">
                PF
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide w-20">
                PA
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide w-20">
                Diff
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, index) => {
              const diff = team.pointsFor - team.pointsAgainst;
              const isPlayoffSpot = index < Math.ceil(standings.length / 2);

              return (
                <tr
                  key={team.memberId}
                  className={`border-b border-gray-700/50 last:border-b-0 ${
                    index % 2 === 0 ? "bg-[#1a1d24]" : "bg-[#1e2128]"
                  }`}
                >
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      index === 0
                        ? "bg-yellow-500/20 text-yellow-400"
                        : index === 1
                        ? "bg-gray-400/20 text-gray-300"
                        : index === 2
                        ? "bg-orange-500/20 text-orange-400"
                        : isPlayoffSpot
                        ? "bg-green-500/10 text-green-400"
                        : "bg-gray-700/30 text-gray-500"
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-white">{team.teamName}</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-mono text-white">
                      {team.ties > 0
                        ? `${team.wins}-${team.losses}-${team.ties}`
                        : `${team.wins}-${team.losses}`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="tabular-nums text-gray-300">{team.pointsFor.toFixed(1)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="tabular-nums text-gray-500">{team.pointsAgainst.toFixed(1)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`tabular-nums font-medium ${
                      diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-gray-500"
                    }`}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {standings.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">No standings data available yet.</p>
            <p className="text-sm text-gray-600 mt-1">Standings will appear after matchups are scored.</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {standings.length > 0 && (
        <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30"></span>
            <span>Playoff position</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">PF</span>
            <span>Points For</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">PA</span>
            <span>Points Against</span>
          </div>
        </div>
      )}
    </div>
  );
}
