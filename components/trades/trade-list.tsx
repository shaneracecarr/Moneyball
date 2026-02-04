"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cancelTradeAction } from "@/lib/actions/trades";
import { PlayerNameLink } from "@/components/player-card/player-name-link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Participant = {
  memberId: string;
  role: string;
  decision: string;
  teamName: string | null;
  userName: string | null;
  userEmail: string | null;
  isBot?: boolean;
};

type TradeItem = {
  id: string;
  playerId: string;
  fromMemberId: string;
  toMemberId: string;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
};

type Trade = {
  id: string;
  leagueId: string;
  proposerMemberId: string;
  status: string;
  createdAt: Date;
  participants: Participant[];
  items: TradeItem[];
};

function getTeamLabel(memberId: string, participants: Participant[]) {
  const p = participants.find((x) => x.memberId === memberId);
  return p?.teamName || p?.userName || p?.userEmail || "Unknown";
}

const STATUS_STYLES: Record<string, string> = {
  proposed: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  completed: "bg-green-50 text-green-700 ring-green-600/20",
  declined: "bg-red-50 text-red-700 ring-red-600/20",
  canceled: "bg-gray-50 text-gray-500 ring-gray-500/20",
};

export function TradeList({
  trades,
  currentMemberId,
  leagueId,
}: {
  trades: Trade[];
  currentMemberId: string;
  leagueId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCancel = (tradeId: string) => {
    startTransition(async () => {
      await cancelTradeAction(tradeId, leagueId);
      router.refresh();
    });
  };

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Trades</CardTitle>
          <CardDescription>No trades have been proposed in this league yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {trades.map((trade) => {
        const isProposer = trade.proposerMemberId === currentMemberId;
        const recipients = trade.participants.filter((p) => p.role === "recipient");
        const pendingCount = recipients.filter((p) => p.decision === "pending").length;

        return (
          <Card key={trade.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Trade {isProposer ? "(You proposed)" : ""}
                </CardTitle>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    STATUS_STYLES[trade.status] || STATUS_STYLES.proposed
                  }`}
                >
                  {trade.status}
                </span>
              </div>
              <CardDescription>
                {new Date(trade.createdAt).toLocaleDateString()} &middot;{" "}
                {trade.participants.length} teams involved
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Trade items */}
              <div className="space-y-1.5">
                {trade.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-1.5"
                  >
                    <PlayerNameLink playerId={item.playerId} playerName={item.playerName} className="font-medium" />
                    <span className="text-gray-400">({item.playerPosition})</span>
                    <span className="text-gray-400 mx-1">&rarr;</span>
                    <span className="text-gray-500">
                      {getTeamLabel(item.fromMemberId, trade.participants)} &rarr;{" "}
                      {getTeamLabel(item.toMemberId, trade.participants)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Participant decisions */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Participants:</p>
                <div className="flex flex-wrap gap-2">
                  {trade.participants.map((p) => (
                    <span
                      key={p.memberId}
                      className={`text-xs px-2 py-1 rounded-full ${
                        p.decision === "accepted"
                          ? "bg-green-50 text-green-700"
                          : p.decision === "declined"
                          ? "bg-red-50 text-red-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {p.teamName || p.userName || p.userEmail}: {p.decision}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {isProposer && trade.status === "proposed" && (
                <div className="border-t pt-3 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Waiting on {pendingCount} recipient{pendingCount !== 1 ? "s" : ""}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(trade.id)}
                    disabled={isPending}
                  >
                    Cancel Trade
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
