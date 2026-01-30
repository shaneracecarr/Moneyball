"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createTradeAction } from "@/lib/actions/trades";
import { PlayerNameLink } from "@/components/player-card/player-name-link";

type RosterPlayer = {
  id: string;
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
  slot: string;
};

type MemberRoster = {
  memberId: string;
  teamName: string | null;
  userName: string | null;
  userId: string | null;
  roster: RosterPlayer[];
};

type TradeItemDraft = {
  playerId: string;
  playerName: string;
  playerPosition: string;
  fromMemberId: string;
  toMemberId: string;
};

export function ProposeTradeForm({
  leagueId,
  currentMemberId,
  memberRosters,
}: {
  leagueId: string;
  currentMemberId: string;
  memberRosters: MemberRoster[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [items, setItems] = useState<TradeItemDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Item builder state
  const [selectedFromMember, setSelectedFromMember] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedToMember, setSelectedToMember] = useState("");

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const otherMembers = memberRosters.filter((m) => m.memberId !== currentMemberId);
  const allParticipantIds = [currentMemberId, ...recipientIds];

  const getLabel = (memberId: string) => {
    const m = memberRosters.find((x) => x.memberId === memberId);
    if (!m) return "Unknown";
    if (m.memberId === currentMemberId) return (m.teamName || m.userName) + " (You)";
    return m.teamName || m.userName;
  };

  const addRecipient = (memberId: string) => {
    if (!recipientIds.includes(memberId)) {
      setRecipientIds([...recipientIds, memberId]);
    }
  };

  const removeRecipient = (memberId: string) => {
    setRecipientIds(recipientIds.filter((id) => id !== memberId));
    // Remove items involving this team
    setItems(items.filter((i) => i.fromMemberId !== memberId && i.toMemberId !== memberId));
  };

  const addItem = () => {
    if (!selectedFromMember || !selectedPlayer || !selectedToMember) {
      setError("Select from team, player, and to team");
      return;
    }
    if (selectedFromMember === selectedToMember) {
      setError("From and To team must be different");
      return;
    }
    if (items.some((i) => i.playerId === selectedPlayer)) {
      setError("Player already in this trade");
      return;
    }
    const fromRoster = memberRosters.find((m) => m.memberId === selectedFromMember);
    const player = fromRoster?.roster.find((r) => r.playerId === selectedPlayer);
    if (!player) {
      setError("Player not found on that roster");
      return;
    }

    setItems([
      ...items,
      {
        playerId: selectedPlayer,
        playerName: player.playerName,
        playerPosition: player.playerPosition,
        fromMemberId: selectedFromMember,
        toMemberId: selectedToMember,
      },
    ]);
    setSelectedPlayer("");
    setError(null);
  };

  const removeItem = (playerId: string) => {
    setItems(items.filter((i) => i.playerId !== playerId));
  };

  const handleSubmit = () => {
    setError(null);
    if (recipientIds.length === 0) {
      setError("Add at least one recipient team");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one trade item");
      return;
    }

    startTransition(async () => {
      const result = await createTradeAction(
        leagueId,
        recipientIds,
        items.map((i) => ({
          playerId: i.playerId,
          fromMemberId: i.fromMemberId,
          toMemberId: i.toMemberId,
        }))
      );
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        setRecipientIds([]);
        setItems([]);
        router.refresh();
      }
    });
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="mb-4">
        Propose Trade
      </Button>
    );
  }

  // Filter available recipients (not already selected)
  const availableRecipients = otherMembers.filter(
    (m) => !recipientIds.includes(m.memberId)
  );

  // For item builder: participants (proposer + recipients)
  const participantRosters = memberRosters.filter((m) =>
    allParticipantIds.includes(m.memberId)
  );

  // Players from selected "from" team (excluding already-added players)
  const usedPlayerIds = new Set(items.map((i) => i.playerId));
  const fromRoster = memberRosters.find((m) => m.memberId === selectedFromMember);
  const availablePlayers = (fromRoster?.roster || []).filter(
    (r) => !usedPlayerIds.has(r.playerId)
  );

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Propose Trade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipient selection */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Recipient Teams
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {recipientIds.map((rid) => (
              <span
                key={rid}
                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-sm"
              >
                {getLabel(rid)}
                <button
                  onClick={() => removeRecipient(rid)}
                  className="text-indigo-400 hover:text-indigo-600 ml-1"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          {availableRecipients.length > 0 && (
            <select
              className="border rounded-md px-3 py-1.5 text-sm w-full max-w-xs"
              value=""
              onChange={(e) => {
                if (e.target.value) addRecipient(e.target.value);
              }}
            >
              <option value="">Add a team...</option>
              {availableRecipients.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {m.teamName || m.userName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Trade items */}
        {recipientIds.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Trade Items
            </label>
            {items.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {items.map((item) => (
                  <div
                    key={item.playerId}
                    className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-sm"
                  >
                    <span>
                      <PlayerNameLink playerId={item.playerId} playerName={item.playerName} className="font-medium" />
                      <span className="text-gray-400 ml-1">({item.playerPosition})</span>
                      <span className="text-gray-400 mx-1">&rarr;</span>
                      {getLabel(item.fromMemberId)} &rarr; {getLabel(item.toMemberId)}
                    </span>
                    <button
                      onClick={() => removeItem(item.playerId)}
                      className="text-red-400 hover:text-red-600 text-xs ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Item builder */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                className="border rounded-md px-3 py-1.5 text-sm"
                value={selectedFromMember}
                onChange={(e) => {
                  setSelectedFromMember(e.target.value);
                  setSelectedPlayer("");
                }}
              >
                <option value="">From team...</option>
                {participantRosters.map((m) => (
                  <option key={m.memberId} value={m.memberId}>
                    {getLabel(m.memberId)}
                  </option>
                ))}
              </select>

              <select
                className="border rounded-md px-3 py-1.5 text-sm"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                disabled={!selectedFromMember}
              >
                <option value="">Select player...</option>
                {availablePlayers.map((r) => (
                  <option key={r.playerId} value={r.playerId}>
                    {r.playerName} ({r.playerPosition})
                  </option>
                ))}
              </select>

              <select
                className="border rounded-md px-3 py-1.5 text-sm"
                value={selectedToMember}
                onChange={(e) => setSelectedToMember(e.target.value)}
                disabled={!selectedFromMember}
              >
                <option value="">To team...</option>
                {participantRosters
                  .filter((m) => m.memberId !== selectedFromMember)
                  .map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {getLabel(m.memberId)}
                    </option>
                  ))}
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={addItem}
              disabled={!selectedFromMember || !selectedPlayer || !selectedToMember}
            >
              + Add Item
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Submitting..." : "Submit Trade"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setRecipientIds([]);
              setItems([]);
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
