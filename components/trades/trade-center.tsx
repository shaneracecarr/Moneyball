"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayerNameLink } from "@/components/player-card/player-name-link";
import {
  createTradeAction,
  acceptTradeAction,
  declineTradeAction,
  cancelTradeAction,
} from "@/lib/actions/trades";

// Position order for grid rows
const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "DEF"];

// Position colors for player cards
const POSITION_COLORS: Record<string, string> = {
  QB: "bg-red-500/20 text-red-400 border-red-500/30",
  RB: "bg-green-500/20 text-green-400 border-green-500/30",
  WR: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  TE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  K: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DEF: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const POSITION_BG: Record<string, string> = {
  QB: "bg-red-500",
  RB: "bg-green-500",
  WR: "bg-blue-500",
  TE: "bg-orange-500",
  K: "bg-purple-500",
  DEF: "bg-slate-600",
};

const POSITION_BORDER: Record<string, string> = {
  QB: "border-red-500/50",
  RB: "border-green-500/50",
  WR: "border-blue-500/50",
  TE: "border-orange-500/50",
  K: "border-purple-500/50",
  DEF: "border-slate-500/50",
};

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

type TradeBlockPlayer = {
  id: string;
  memberId: string;
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
  note: string | null;
  teamName: string | null;
};

type WatchlistPlayer = {
  id: string;
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
};

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

interface TradeCenterProps {
  leagueId: string;
  leagueName: string;
  currentMemberId: string;
  memberRosters: MemberRoster[];
  trades: Trade[];
  tradeBlock: TradeBlockPlayer[];
  watchlist: WatchlistPlayer[];
}

type TradeItemDraft = {
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerTeam: string | null;
  fromMemberId: string;
  toMemberId: string;
};

const STATUS_STYLES: Record<string, string> = {
  proposed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  declined: "bg-red-500/20 text-red-400 border-red-500/30",
  canceled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function TradeCenter({
  leagueId,
  leagueName,
  currentMemberId,
  memberRosters,
  trades,
  tradeBlock,
  watchlist,
}: TradeCenterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // View state: "grid" (league roster overview) or "builder" (trade builder)
  const [view, setView] = useState<"grid" | "builder">("grid");

  // Selected trade partners (team IDs to trade with)
  const [selectedPartners, setSelectedPartners] = useState<Set<string>>(new Set());

  // Trade builder state
  const [tradeItems, setTradeItems] = useState<TradeItemDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Tab state for trades list
  const [activeTab, setActiveTab] = useState<"incoming" | "history">("incoming");

  const myRoster = memberRosters.find((m) => m.memberId === currentMemberId);
  const otherMembers = memberRosters.filter((m) => m.memberId !== currentMemberId);

  // Get all teams involved in trade (me + selected partners)
  const tradeTeams = memberRosters.filter(
    (m) => m.memberId === currentMemberId || selectedPartners.has(m.memberId)
  );

  // Separate trades by status
  const incomingTrades = trades.filter((t) => {
    const myParticipant = t.participants.find((p) => p.memberId === currentMemberId);
    return t.status === "proposed" && myParticipant?.role === "recipient" && myParticipant?.decision === "pending";
  });

  const historyTrades = trades.filter((t) => {
    if (t.status !== "proposed") return true;
    const myParticipant = t.participants.find((p) => p.memberId === currentMemberId);
    return !(myParticipant?.role === "recipient" && myParticipant?.decision === "pending");
  });

  const getTeamLabel = (memberId: string, short?: boolean) => {
    const m = memberRosters.find((x) => x.memberId === memberId);
    if (!m) return "Unknown";
    const name = m.teamName || m.userName || "Unknown";
    if (m.memberId === currentMemberId) return short ? name : name + " (You)";
    return name;
  };

  const togglePartnerSelection = (memberId: string) => {
    const newSet = new Set(selectedPartners);
    if (newSet.has(memberId)) {
      newSet.delete(memberId);
    } else {
      newSet.add(memberId);
    }
    setSelectedPartners(newSet);
  };

  const startTradeBuilder = () => {
    if (selectedPartners.size === 0) return;
    setView("builder");
    setTradeItems([]);
    setError(null);
  };

  const backToGrid = () => {
    setView("grid");
    setTradeItems([]);
    setError(null);
  };

  const togglePlayerInTrade = (
    player: RosterPlayer,
    fromMemberId: string
  ) => {
    const existing = tradeItems.find((i) => i.playerId === player.playerId);
    if (existing) {
      // Remove from trade
      setTradeItems(tradeItems.filter((i) => i.playerId !== player.playerId));
    } else {
      // Add to trade - need to select destination
      // For now, just mark as selected (destination TBD)
      setTradeItems([
        ...tradeItems,
        {
          playerId: player.playerId,
          playerName: player.playerName,
          playerPosition: player.playerPosition,
          playerTeam: player.playerTeam,
          fromMemberId,
          toMemberId: "", // Will be set when assigning destination
        },
      ]);
    }
    setError(null);
  };

  const setPlayerDestination = (playerId: string, toMemberId: string) => {
    setTradeItems(
      tradeItems.map((item) =>
        item.playerId === playerId ? { ...item, toMemberId } : item
      )
    );
  };

  const isPlayerSelected = (playerId: string) =>
    tradeItems.some((i) => i.playerId === playerId);

  const getPlayerDestination = (playerId: string) =>
    tradeItems.find((i) => i.playerId === playerId)?.toMemberId || "";

  const submitTrade = () => {
    // Validate all players have destinations
    const incompleteItems = tradeItems.filter((i) => !i.toMemberId);
    if (incompleteItems.length > 0) {
      setError("Please assign a destination for all selected players");
      return;
    }

    if (tradeItems.length === 0) {
      setError("Add at least one player to the trade");
      return;
    }

    // Validate trade has players going to/from me
    const itemsFromMe = tradeItems.filter((i) => i.fromMemberId === currentMemberId);
    const itemsToMe = tradeItems.filter((i) => i.toMemberId === currentMemberId);

    if (itemsFromMe.length === 0 || itemsToMe.length === 0) {
      setError("You must give and receive at least one player");
      return;
    }

    // Get unique recipients (excluding me)
    const recipients = Array.from(
      new Set(
        tradeItems
          .filter((i) => i.fromMemberId === currentMemberId)
          .map((i) => i.toMemberId)
      )
    );

    startTransition(async () => {
      const result = await createTradeAction(
        leagueId,
        recipients,
        tradeItems.map((i) => ({
          playerId: i.playerId,
          fromMemberId: i.fromMemberId,
          toMemberId: i.toMemberId,
        }))
      );
      if (result.error) {
        setError(result.error);
      } else {
        setSelectedPartners(new Set());
        setTradeItems([]);
        setError(null);
        setView("grid");
        router.refresh();
      }
    });
  };

  const handleAccept = (tradeId: string) => {
    startTransition(async () => {
      await acceptTradeAction(tradeId, leagueId);
      router.refresh();
    });
  };

  const handleDecline = (tradeId: string) => {
    startTransition(async () => {
      await declineTradeAction(tradeId, leagueId);
      router.refresh();
    });
  };

  const handleCancel = (tradeId: string) => {
    startTransition(async () => {
      await cancelTradeAction(tradeId, leagueId);
      router.refresh();
    });
  };

  // Group roster by position for grid view
  const getPlayersByPosition = (roster: RosterPlayer[]) => {
    const byPosition: Record<string, RosterPlayer[]> = {};
    for (const pos of POSITION_ORDER) {
      byPosition[pos] = [];
    }
    for (const player of roster) {
      const pos = player.playerPosition;
      if (byPosition[pos]) {
        byPosition[pos].push(player);
      }
    }
    return byPosition;
  };

  // Get max players per position across all teams
  const getMaxPlayersPerPosition = () => {
    const maxCounts: Record<string, number> = {};
    for (const pos of POSITION_ORDER) {
      maxCounts[pos] = 0;
    }
    for (const member of memberRosters) {
      const byPos = getPlayersByPosition(member.roster);
      for (const pos of POSITION_ORDER) {
        maxCounts[pos] = Math.max(maxCounts[pos], byPos[pos].length);
      }
    }
    return maxCounts;
  };

  const maxPlayersPerPosition = getMaxPlayersPerPosition();

  // Items grouped by direction
  const itemsGiving = tradeItems.filter((i) => i.fromMemberId === currentMemberId && i.toMemberId);
  const itemsReceiving = tradeItems.filter((i) => i.toMemberId === currentMemberId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Trade Center</h1>
          {view === "builder" && (
            <button
              onClick={backToGrid}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
            >
              <span>←</span> Back to League
            </button>
          )}
        </div>
        {incomingTrades.length > 0 && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            {incomingTrades.length} Pending Trade{incomingTrades.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* League Roster Grid View */}
      {view === "grid" && (
        <>
          {/* Instructions */}
          <div className="bg-[#252830] rounded-xl border border-gray-700 p-4">
            <p className="text-gray-300 text-sm">
              <span className="text-purple-400 font-medium">Click team headers</span> to select trade partners, then click{" "}
              <span className="text-purple-400 font-medium">Start Trade</span> to build your trade.
            </p>
            {selectedPartners.size > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  Selected: {Array.from(selectedPartners).map((id) => getTeamLabel(id, true)).join(", ")}
                </span>
                <button
                  onClick={startTradeBuilder}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  Start Trade →
                </button>
              </div>
            )}
          </div>

          {/* League Roster Grid */}
          <div className="bg-[#1a1d24] rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-700">
                    {memberRosters.map((member) => {
                      const isMe = member.memberId === currentMemberId;
                      const isSelected = selectedPartners.has(member.memberId);
                      return (
                        <th
                          key={member.memberId}
                          className={`px-1 py-2 text-center transition-colors ${
                            isMe
                              ? "bg-purple-600/20"
                              : isSelected
                              ? "bg-green-600/20 cursor-pointer hover:bg-green-600/30"
                              : "bg-[#252830] cursor-pointer hover:bg-gray-700"
                          }`}
                          onClick={() => !isMe && togglePartnerSelection(member.memberId)}
                        >
                          <span className={`text-xs font-semibold truncate block ${isMe ? "text-purple-300" : isSelected ? "text-green-300" : "text-white"}`}>
                            {member.teamName || member.userName}
                          </span>
                          {isMe ? (
                            <span className="text-[9px] text-purple-400">You</span>
                          ) : isSelected ? (
                            <span className="text-[9px] text-green-400">✓</span>
                          ) : null}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {POSITION_ORDER.map((position) => {
                    const maxCount = maxPlayersPerPosition[position] || 1;
                    return Array.from({ length: maxCount }).map((_, idx) => (
                      <tr
                        key={`${position}-${idx}`}
                        className="border-b border-gray-800/50"
                      >
                        {memberRosters.map((member) => {
                          const playersByPos = getPlayersByPosition(member.roster);
                          const players = playersByPos[position] || [];
                          const player = players[idx];
                          const isMe = member.memberId === currentMemberId;
                          const isSelected = selectedPartners.has(member.memberId);
                          const isOnTradeBlock = player && tradeBlock.some((tb) => tb.playerId === player.playerId);
                          const isOnWatchlist = player && watchlist.some((w) => w.playerId === player.playerId);

                          return (
                            <td
                              key={member.memberId}
                              className={`px-0.5 py-0.5 ${
                                isMe ? "bg-purple-600/5" : isSelected ? "bg-green-600/5" : ""
                              }`}
                            >
                              {player ? (
                                <div
                                  className={`px-1 py-0.5 rounded border ${POSITION_BORDER[position]} bg-[#252830] hover:bg-[#2a2f3a] transition-colors`}
                                >
                                  <div className="flex items-center gap-1">
                                    <PlayerNameLink
                                      playerId={player.playerId}
                                      playerName={player.playerName}
                                      className="text-[11px] text-white hover:text-purple-400 truncate flex-1 leading-tight"
                                    />
                                    {isOnTradeBlock && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" title="On Trade Block" />
                                    )}
                                    {isOnWatchlist && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" title="On Watchlist" />
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="px-1 py-0.5 rounded border border-gray-800/50 bg-[#1a1d24]">
                                  <p className="text-[10px] text-gray-700 leading-tight">—</p>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trade Block & Watchlist Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trade Block */}
            <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Trade Block
                </h3>
                <p className="text-xs text-gray-500">Players actively being shopped</p>
              </div>
              <div className="p-3 max-h-48 overflow-y-auto">
                {tradeBlock.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-3">No players on trade block</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {tradeBlock.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1a1d24] border border-yellow-500/20"
                      >
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${POSITION_COLORS[player.playerPosition]}`}>
                          {player.playerPosition}
                        </span>
                        <div className="flex-1 min-w-0">
                          <PlayerNameLink
                            playerId={player.playerId}
                            playerName={player.playerName}
                            className="text-xs text-white hover:text-purple-400 truncate block"
                          />
                          <p className="text-[10px] text-gray-500 truncate">{player.teamName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Watchlist */}
            <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Your Watchlist
                </h3>
                <p className="text-xs text-gray-500">Players you're tracking</p>
              </div>
              <div className="p-3 max-h-48 overflow-y-auto">
                {watchlist.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-3">No players on watchlist</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {watchlist.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1a1d24] border border-blue-500/20"
                      >
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${POSITION_COLORS[player.playerPosition]}`}>
                          {player.playerPosition}
                        </span>
                        <PlayerNameLink
                          playerId={player.playerId}
                          playerName={player.playerName}
                          className="text-xs text-white hover:text-purple-400 truncate"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trades Tabs */}
          <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveTab("incoming")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === "incoming"
                    ? "bg-[#1a1d24] text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#1e2128]"
                }`}
              >
                Incoming Trades
                {incomingTrades.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500 text-black text-xs font-bold">
                    {incomingTrades.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "history"
                    ? "bg-[#1a1d24] text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#1e2128]"
                }`}
              >
                Trade History
              </button>
            </div>
            <div className="p-4">
              {activeTab === "incoming" && (
                <div className="space-y-3">
                  {incomingTrades.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No pending trade offers</p>
                  ) : (
                    incomingTrades.map((trade) => (
                      <TradeCard
                        key={trade.id}
                        trade={trade}
                        currentMemberId={currentMemberId}
                        getTeamLabel={getTeamLabel}
                        onAccept={() => handleAccept(trade.id)}
                        onDecline={() => handleDecline(trade.id)}
                        onCancel={() => handleCancel(trade.id)}
                        isPending={isPending}
                        showActions
                      />
                    ))
                  )}
                </div>
              )}
              {activeTab === "history" && (
                <div className="space-y-3">
                  {historyTrades.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No trade history</p>
                  ) : (
                    historyTrades.map((trade) => {
                      const isProposer = trade.proposerMemberId === currentMemberId;
                      const showActions = isProposer && trade.status === "proposed";
                      return (
                        <TradeCard
                          key={trade.id}
                          trade={trade}
                          currentMemberId={currentMemberId}
                          getTeamLabel={getTeamLabel}
                          onAccept={() => handleAccept(trade.id)}
                          onDecline={() => handleDecline(trade.id)}
                          onCancel={() => handleCancel(trade.id)}
                          isPending={isPending}
                          showActions={showActions}
                        />
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Trade Builder View */}
      {view === "builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Team Rosters */}
          <div className="lg:col-span-2 space-y-4">
            <p className="text-sm text-gray-400">
              Click players to add them to the trade, then select their destination team.
            </p>

            {/* Roster columns for each team in trade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tradeTeams.map((team) => {
                const isMe = team.memberId === currentMemberId;
                const playersByPos = getPlayersByPosition(team.roster);

                return (
                  <div
                    key={team.memberId}
                    className={`bg-[#252830] rounded-xl border overflow-hidden ${
                      isMe ? "border-purple-500/50" : "border-gray-700"
                    }`}
                  >
                    <div className={`px-4 py-3 border-b border-gray-700 ${isMe ? "bg-purple-600/20" : "bg-[#1e2128]"}`}>
                      <h3 className={`text-sm font-semibold ${isMe ? "text-purple-300" : "text-white"}`}>
                        {team.teamName || team.userName}
                        {isMe && <span className="ml-2 text-xs text-purple-400">(You)</span>}
                      </h3>
                    </div>
                    <div className="p-2 max-h-[500px] overflow-y-auto space-y-2">
                      {POSITION_ORDER.map((position) => {
                        const players = playersByPos[position] || [];
                        if (players.length === 0) return null;

                        return (
                          <div key={position}>
                            <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 px-1 ${
                              POSITION_COLORS[position].split(" ")[1]
                            }`}>
                              {position}
                            </p>
                            <div className="space-y-1">
                              {players.map((player) => {
                                const selected = isPlayerSelected(player.playerId);
                                const destination = getPlayerDestination(player.playerId);
                                const posBg = POSITION_BG[player.playerPosition] || POSITION_BG.DEF;

                                return (
                                  <div key={player.id} className="space-y-1">
                                    <button
                                      onClick={() => togglePlayerInTrade(player, team.memberId)}
                                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left ${
                                        selected
                                          ? isMe
                                            ? "bg-red-600/20 border-2 border-red-500"
                                            : "bg-green-600/20 border-2 border-green-500"
                                          : "bg-[#1a1d24] border border-gray-700 hover:border-gray-500"
                                      }`}
                                    >
                                      <span className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${posBg}`}>
                                        {player.playerPosition}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                          {player.playerName}
                                        </p>
                                        <p className="text-xs text-gray-500">{player.playerTeam || "FA"}</p>
                                      </div>
                                      {selected && (
                                        <span className={`text-lg ${isMe ? "text-red-400" : "text-green-400"}`}>
                                          ✓
                                        </span>
                                      )}
                                    </button>

                                    {/* Destination selector when player is selected */}
                                    {selected && (
                                      <div className="ml-10 flex items-center gap-2">
                                        <span className="text-xs text-gray-400">→</span>
                                        <select
                                          value={destination}
                                          onChange={(e) => setPlayerDestination(player.playerId, e.target.value)}
                                          className="flex-1 px-2 py-1 rounded bg-[#1a1d24] border border-gray-600 text-sm text-white focus:border-purple-500 focus:outline-none"
                                        >
                                          <option value="">Select destination...</option>
                                          {tradeTeams
                                            .filter((t) => t.memberId !== team.memberId)
                                            .map((t) => (
                                              <option key={t.memberId} value={t.memberId}>
                                                {t.teamName || t.userName}
                                                {t.memberId === currentMemberId ? " (You)" : ""}
                                              </option>
                                            ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Trade Summary */}
          <div className="space-y-4">
            <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Trade Summary
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {tradeItems.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Click players to add them to the trade
                  </p>
                ) : (
                  <>
                    {/* You Give */}
                    <div>
                      <p className="text-xs text-red-400 font-medium mb-2 uppercase tracking-wide">You Give</p>
                      {itemsGiving.length === 0 ? (
                        <p className="text-xs text-gray-500">No players selected</p>
                      ) : (
                        <div className="space-y-1">
                          {itemsGiving.map((item) => (
                            <div
                              key={item.playerId}
                              className="flex items-center gap-2 px-2 py-1.5 rounded bg-red-500/10 border border-red-500/20"
                            >
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${POSITION_COLORS[item.playerPosition]}`}>
                                {item.playerPosition}
                              </span>
                              <span className="text-sm text-white flex-1">{item.playerName}</span>
                              <span className="text-xs text-gray-400">→ {getTeamLabel(item.toMemberId, true)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* You Receive */}
                    <div>
                      <p className="text-xs text-green-400 font-medium mb-2 uppercase tracking-wide">You Receive</p>
                      {itemsReceiving.length === 0 ? (
                        <p className="text-xs text-gray-500">No players selected</p>
                      ) : (
                        <div className="space-y-1">
                          {itemsReceiving.map((item) => (
                            <div
                              key={item.playerId}
                              className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-500/10 border border-green-500/20"
                            >
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${POSITION_COLORS[item.playerPosition]}`}>
                                {item.playerPosition}
                              </span>
                              <span className="text-sm text-white flex-1">{item.playerName}</span>
                              <span className="text-xs text-gray-400">← {getTeamLabel(item.fromMemberId, true)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pending destination assignments */}
                    {tradeItems.filter((i) => !i.toMemberId).length > 0 && (
                      <div>
                        <p className="text-xs text-yellow-400 font-medium mb-2 uppercase tracking-wide">
                          Needs Destination
                        </p>
                        <div className="space-y-1">
                          {tradeItems
                            .filter((i) => !i.toMemberId)
                            .map((item) => (
                              <div
                                key={item.playerId}
                                className="flex items-center gap-2 px-2 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/20"
                              >
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${POSITION_COLORS[item.playerPosition]}`}>
                                  {item.playerPosition}
                                </span>
                                <span className="text-sm text-white">{item.playerName}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded">{error}</p>
                )}

                <button
                  onClick={submitTrade}
                  disabled={isPending || tradeItems.length === 0}
                  className="w-full px-4 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? "Submitting..." : "Propose Trade"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Trade Card Component
function TradeCard({
  trade,
  currentMemberId,
  getTeamLabel,
  onAccept,
  onDecline,
  onCancel,
  isPending,
  showActions,
}: {
  trade: Trade;
  currentMemberId: string;
  getTeamLabel: (id: string, short?: boolean) => string;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  isPending: boolean;
  showActions: boolean;
}) {
  const isProposer = trade.proposerMemberId === currentMemberId;
  const myParticipant = trade.participants.find((p) => p.memberId === currentMemberId);
  const isRecipientPending = myParticipant?.role === "recipient" && myParticipant?.decision === "pending";

  // Group items by direction relative to current user
  const itemsIGive = trade.items.filter((i) => i.fromMemberId === currentMemberId);
  const itemsIReceive = trade.items.filter((i) => i.toMemberId === currentMemberId);

  const statusStyle = STATUS_STYLES[trade.status] || STATUS_STYLES.proposed;

  return (
    <div className="bg-[#1a1d24] rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between bg-[#1e2128]">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusStyle}`}>
            {trade.status}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(trade.createdAt).toLocaleDateString()}
          </span>
          {isProposer && <span className="text-[10px] text-purple-400">(You proposed)</span>}
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          {/* What you give */}
          <div>
            <p className="text-[10px] text-red-400 font-medium mb-1.5 uppercase tracking-wide">
              {isProposer ? "You Give" : `${getTeamLabel(trade.proposerMemberId, true)} Gives`}
            </p>
            <div className="space-y-1">
              {(isProposer ? itemsIGive : trade.items.filter((i) => i.fromMemberId === trade.proposerMemberId)).map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#252830]"
                  >
                    <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${POSITION_COLORS[item.playerPosition]}`}>
                      {item.playerPosition}
                    </span>
                    <span className="text-xs text-white truncate">{item.playerName}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* What you receive */}
          <div>
            <p className="text-[10px] text-green-400 font-medium mb-1.5 uppercase tracking-wide">
              {isProposer ? "You Receive" : "You Give"}
            </p>
            <div className="space-y-1">
              {(isProposer ? itemsIReceive : trade.items.filter((i) => i.toMemberId === trade.proposerMemberId)).map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#252830]"
                  >
                    <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${POSITION_COLORS[item.playerPosition]}`}>
                      {item.playerPosition}
                    </span>
                    <span className="text-xs text-white truncate">{item.playerName}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && trade.status === "proposed" && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
            {isRecipientPending && (
              <>
                <button
                  onClick={onAccept}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  onClick={onDecline}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Decline
                </button>
              </>
            )}
            {isProposer && (
              <button
                onClick={onCancel}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-xs font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
