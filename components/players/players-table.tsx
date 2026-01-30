"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pickupPlayerAction, dropPlayerAction } from "@/lib/actions/roster";
import { PlayerNameLink } from "@/components/player-card/player-name-link";

interface Player {
  id: string;
  sleeperId: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  team: string | null;
  position: string;
  status: string | null;
  injuryStatus: string | null;
  age: number | null;
  yearsExp: number | null;
  number: number | null;
  adp: number | null;
  seasonPoints: number | null;
}

interface PlayersTableProps {
  players: Player[];
  activeLeagueId?: string | null;
  ownedPlayerIds?: string[];
}

export function PlayersTable({ players, activeLeagueId, ownedPlayerIds = [] }: PlayersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionPlayerId, setActionPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const ownedSet = new Set(ownedPlayerIds);

  function handlePickup(playerId: string) {
    if (!activeLeagueId) return;
    setError(null);
    setSuccessMsg(null);
    setActionPlayerId(playerId);
    const formData = new FormData();
    formData.set("leagueId", activeLeagueId);
    formData.set("playerId", playerId);
    startTransition(async () => {
      const result = await pickupPlayerAction(formData);
      setActionPlayerId(null);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMsg("Player added to your team!");
        router.refresh();
      }
    });
  }

  if (players.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No players found. Try adjusting your filters or sync players from the admin
          panel.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMsg}
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {activeLeagueId && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.map((player) => {
                  const isOwned = ownedSet.has(player.id);
                  return (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          <PlayerNameLink playerId={player.id} playerName={player.fullName} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {player.team || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          {player.position}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {player.number || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {player.age || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {player.yearsExp !== null ? player.yearsExp : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {player.injuryStatus && (
                            <span
                              className={`px-2 py-1 text-xs rounded ${
                                player.injuryStatus === "Out"
                                  ? "bg-red-100 text-red-800"
                                  : player.injuryStatus === "Questionable"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-orange-100 text-orange-800"
                              }`}
                            >
                              {player.injuryStatus}
                            </span>
                          )}
                          {!player.injuryStatus && player.status && (
                            <span className="text-gray-500 text-xs">
                              {player.status}
                            </span>
                          )}
                          {!player.injuryStatus && !player.status && (
                            <span className="text-green-600 text-xs">Active</span>
                          )}
                        </div>
                      </td>
                      {activeLeagueId && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {isOwned ? (
                            <span className="text-xs text-gray-400 font-medium">Rostered</span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handlePickup(player.id)}
                              disabled={isPending && actionPlayerId === player.id}
                            >
                              {isPending && actionPlayerId === player.id
                                ? "Adding..."
                                : "Add to Team"}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
