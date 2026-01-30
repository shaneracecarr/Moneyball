import type { TeamStanding } from "@/lib/actions/standings";

interface StandingsTableProps {
  standings: TeamStanding[];
  currentUserId?: string;
  memberUserIds?: Record<string, string | null>;
}

export function StandingsTable({ standings, currentUserId, memberUserIds }: StandingsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-3 w-8">#</th>
            <th className="py-2 pr-3">Team</th>
            <th className="py-2 pr-3 text-center w-10">W</th>
            <th className="py-2 pr-3 text-center w-10">L</th>
            <th className="py-2 pr-3 text-center w-10">T</th>
            <th className="py-2 pr-3 text-right">PF</th>
            <th className="py-2 text-right">PA</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, i) => {
            const isCurrentUser =
              currentUserId &&
              memberUserIds &&
              memberUserIds[team.memberId] === currentUserId;

            return (
              <tr
                key={team.memberId}
                className={`border-b last:border-0 ${
                  isCurrentUser ? "bg-indigo-50 font-medium" : ""
                }`}
              >
                <td className="py-2 pr-3 text-gray-500">{i + 1}</td>
                <td className="py-2 pr-3">
                  {team.teamName}
                  {isCurrentUser && (
                    <span className="text-xs text-indigo-500 ml-1">(You)</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-center">{team.wins}</td>
                <td className="py-2 pr-3 text-center">{team.losses}</td>
                <td className="py-2 pr-3 text-center">{team.ties}</td>
                <td className="py-2 pr-3 text-right">{team.pointsFor.toFixed(1)}</td>
                <td className="py-2 text-right">{team.pointsAgainst.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
