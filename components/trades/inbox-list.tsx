"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptTradeAction, declineTradeAction } from "@/lib/actions/trades";
import { PlayerNameLink } from "@/components/player-card/player-name-link";

type Participant = {
  memberId: string;
  role: string;
  decision: string;
  teamName: string | null;
  userName: string | null;
  userEmail: string;
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

export function InboxList({
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

  const handleAccept = (tradeId: string) => {
    startTransition(async () => {
      const result = await acceptTradeAction(tradeId, leagueId);
      if (result.error) {
        alert(result.error);
      }
      router.refresh();
    });
  };

  const handleDecline = (tradeId: string) => {
    startTransition(async () => {
      const result = await declineTradeAction(tradeId, leagueId);
      if (result.error) {
        alert(result.error);
      }
      router.refresh();
    });
  };

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inbox Empty</CardTitle>
          <CardDescription>No pending trades require your action.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {trades.map((trade) => {
        const proposer = trade.participants.find((p) => p.role === "proposer");
        const recipients = trade.participants.filter((p) => p.role === "recipient");
        const myParticipant = trade.participants.find(
          (p) => p.memberId === currentMemberId && p.role === "recipient"
        );

        return (
          <Card key={trade.id} className="border-yellow-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Trade from {proposer?.teamName || proposer?.userName || proposer?.userEmail}
                </CardTitle>
                <span className="inline-flex items-center rounded-md bg-yellow-50 text-yellow-700 px-2 py-1 text-xs font-medium ring-1 ring-inset ring-yellow-600/20">
                  Action Required
                </span>
              </div>
              <CardDescription>
                {new Date(trade.createdAt).toLocaleDateString()} &middot;{" "}
                {trade.participants.length} teams involved
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Items */}
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

              {/* Other participants' decisions */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Participant status:</p>
                <div className="flex flex-wrap gap-2">
                  {recipients.map((p) => (
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
                      {p.teamName || p.userName || p.userEmail}:{" "}
                      {p.memberId === currentMemberId ? "You" : p.decision}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {myParticipant && myParticipant.decision === "pending" && (
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(trade.id)}
                    disabled={isPending}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecline(trade.id)}
                    disabled={isPending}
                  >
                    Decline
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
