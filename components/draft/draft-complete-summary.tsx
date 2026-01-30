"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerNameLink } from "@/components/player-card/player-name-link";

type Pick = {
  memberId: string;
  pickNumber: number;
  round: number;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
  playerId: string;
  userName: string | null;
  userEmail: string | null;
  teamName: string | null;
};

type OrderEntry = {
  memberId: string;
  userName: string | null;
  userEmail: string | null;
  teamName: string | null;
};

interface DraftCompleteSummaryProps {
  order: OrderEntry[];
  picks: Pick[];
}

export function DraftCompleteSummary({ order, picks }: DraftCompleteSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-gray-900">Draft Complete!</h2>
        <p className="text-gray-500">Here are the final rosters.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {order.map((entry) => {
          const teamPicks = picks
            .filter((p) => p.memberId === entry.memberId)
            .sort((a, b) => a.pickNumber - b.pickNumber);
          return (
            <Card key={entry.memberId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {entry.teamName || entry.userName || entry.userEmail}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {teamPicks.map((pick) => (
                    <div key={pick.pickNumber} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 w-8">R{pick.round}</span>
                      <PlayerNameLink playerId={pick.playerId} playerName={pick.playerName} className="font-medium" />
                      <span className="text-gray-500 text-xs">{pick.playerPosition}</span>
                      {pick.playerTeam && (
                        <span className="text-gray-400 text-xs">{pick.playerTeam}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
