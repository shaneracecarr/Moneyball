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
  DEF: "bg-slate-500",
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

  // Trade builder state
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [tradeItems, setTradeItems] = useState<TradeItemDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"propose" | "incoming" | "history">("propose");

  const myRoster = memberRosters.find((m) => m.memberId === currentMemberId);
  const partnerRoster = selectedPartner
    ? memberRosters.find((m) => m.memberId === selectedPartner)
    : null;
  const otherMembers = memberRosters.filter((m) => m.memberId !== currentMemberId);

  // Separate trades by status
  const incomingTrades = trades.filter((t) => {
    const myParticipant = t.participants.find((p) => p.memberId === currentMemberId);
    return t.status === "proposed" && myParticipant?.role === "recipient" && myParticipant?.decision === "pending";
  });

  const myProposedTrades = trades.filter((t) => t.proposerMemberId === currentMemberId && t.status === "proposed");
  const completedTrades = trades.filter((t) => t.status === "completed");
  const declinedTrades = trades.filter((t) => t.status === "declined" || t.status === "canceled");

  // All history trades (everything except pending incoming)
  const historyTrades = trades.filter((t) => {
    if (t.status !== "proposed") return true;
    const myParticipant = t.participants.find((p) => p.memberId === currentMemberId);
    return !(myParticipant?.role === "recipient" && myParticipant?.decision === "pending");
  });

  const getTeamLabel = (memberId: string) => {
    const m = memberRosters.find((x) => x.memberId === memberId);
    if (!m) return "Unknown";
    if (m.memberId === currentMemberId) return (m.teamName || m.userName) + " (You)";
    return m.teamName || m.userName || "Unknown";
  };

  const togglePlayerInTrade = (player: RosterPlayer, fromMemberId: string, toMemberId: string) => {
    const existing = tradeItems.find((i) => i.playerId === player.playerId);
    if (existing) {
      setTradeItems(tradeItems.filter((i) => i.playerId !== player.playerId));
    } else {
      setTradeItems([
        ...tradeItems,
        {
          playerId: player.playerId,
          playerName: player.playerName,
          playerPosition: player.playerPosition,
          fromMemberId,
          toMemberId,
        },
      ]);
    }
    setError(null);
  };

  const isPlayerSelected = (playerId: string) => tradeItems.some((i) => i.playerId === playerId);

  const submitTrade = () => {
    if (!selectedPartner) {
      setError("Select a trade partner first");
      return;
    }
    if (tradeItems.length === 0) {
      setError("Add at least one player to the trade");
      return;
    }

    // Validate trade has players going both ways
    const itemsFromMe = tradeItems.filter((i) => i.fromMemberId === currentMemberId);
    const itemsFromPartner = tradeItems.filter((i) => i.fromMemberId === selectedPartner);

    if (itemsFromMe.length === 0 || itemsFromPartner.length === 0) {
      setError("A trade must include players from both teams");
      return;
    }

    startTransition(async () => {
      const result = await createTradeAction(
        leagueId,
        [selectedPartner],
        tradeItems.map((i) => ({
          playerId: i.playerId,
          fromMemberId: i.fromMemberId,
          toMemberId: i.toMemberId,
        }))
      );
      if (result.error) {
        setError(result.error);
      } else {
        setSelectedPartner(null);
        setTradeItems([]);
        setError(null);
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

  // Items the current user is giving/receiving
  const itemsGiving = tradeItems.filter((i) => i.fromMemberId === currentMemberId);
  const itemsReceiving = tradeItems.filter((i) => i.toMemberId === currentMemberId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{leagueName} - Trade Center</h1>
        {incomingTrades.length > 0 && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            {incomingTrades.length} Pending Trade{incomingTrades.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab("propose")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "propose"
              ? "bg-purple-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          Propose Trade
        </button>
        <button
          onClick={() => setActiveTab("incoming")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors relative ${
            activeTab === "incoming"
              ? "bg-purple-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          Incoming
          {incomingTrades.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 text-black text-xs flex items-center justify-center font-bold">
              {incomingTrades.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-purple-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          History
        </button>
      </div>

      {/* Propose Trade Tab */}
      {activeTab === "propose" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Trade Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trade Partner Selector */}
            <div className="bg-[#252830] rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Select Trade Partner
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {otherMembers.map((member) => (
                  <button
                    key={member.memberId}
                    onClick={() => {
                      setSelectedPartner(member.memberId);
                      setTradeItems([]);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedPartner === member.memberId
                        ? "bg-purple-600 text-white ring-2 ring-purple-400"
                        : "bg-[#1a1d24] text-gray-300 border border-gray-700 hover:border-purple-500"
                    }`}
                  >
                    {member.teamName || member.userName}
                  </button>
                ))}
              </div>
            </div>

            {/* Roster Grids */}
            {selectedPartner && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Your Roster */}
                <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700 bg-purple-600/20">
                    <h3 className="text-sm font-semibold text-purple-300">Your Players</h3>
                    <p className="text-xs text-gray-400">Click to add to trade</p>
                  </div>
                  <div className="p-2 max-h-96 overflow-y-auto space-y-1">
                    {myRoster?.roster.map((player) => {
                      const selected = isPlayerSelected(player.playerId);
                      const posColor = POSITION_COLORS[player.playerPosition] || POSITION_COLORS.DEF;
                      const posBg = POSITION_BG[player.playerPosition] || POSITION_BG.DEF;
                      return (
                        <button
                          key={player.id}
                          onClick={() =>
                            togglePlayerInTrade(player, currentMemberId, selectedPartner)
                          }
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                            selected
                              ? "bg-purple-600/30 border-2 border-purple-500"
                              : "bg-[#1a1d24] border border-gray-700 hover:border-gray-500"
                          }`}
                        >
                          <span className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${posBg}`}>
                            {player.playerPosition}
                          </span>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {player.playerName}
                            </p>
                            <p className="text-xs text-gray-500">{player.playerTeam || "FA"}</p>
                          </div>
                          {selected && (
                            <span className="text-purple-400 text-lg">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Partner Roster */}
                <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700 bg-gray-700/30">
                    <h3 className="text-sm font-semibold text-gray-300">
                      {partnerRoster?.teamName || partnerRoster?.userName}'s Players
                    </h3>
                    <p className="text-xs text-gray-400">Click to add to trade</p>
                  </div>
                  <div className="p-2 max-h-96 overflow-y-auto space-y-1">
                    {partnerRoster?.roster.map((player) => {
                      const selected = isPlayerSelected(player.playerId);
                      const posBg = POSITION_BG[player.playerPosition] || POSITION_BG.DEF;
                      return (
                        <button
                          key={player.id}
                          onClick={() =>
                            togglePlayerInTrade(player, selectedPartner, currentMemberId)
                          }
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                            selected
                              ? "bg-green-600/30 border-2 border-green-500"
                              : "bg-[#1a1d24] border border-gray-700 hover:border-gray-500"
                          }`}
                        >
                          <span className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${posBg}`}>
                            {player.playerPosition}
                          </span>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {player.playerName}
                            </p>
                            <p className="text-xs text-gray-500">{player.playerTeam || "FA"}</p>
                          </div>
                          {selected && (
                            <span className="text-green-400 text-lg">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Trade Summary & Lists */}
          <div className="space-y-6">
            {/* Trade Summary */}
            <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                  Trade Summary
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {tradeItems.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Select players to build your trade
                  </p>
                ) : (
                  <>
                    {/* You Give */}
                    <div>
                      <p className="text-xs text-red-400 font-medium mb-2">YOU GIVE</p>
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
                              <span className="text-sm text-white">{item.playerName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* You Receive */}
                    <div>
                      <p className="text-xs text-green-400 font-medium mb-2">YOU RECEIVE</p>
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
                              <span className="text-sm text-white">{item.playerName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded">{error}</p>
                )}

                <button
                  onClick={submitTrade}
                  disabled={isPending || tradeItems.length === 0 || !selectedPartner}
                  className="w-full px-4 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? "Submitting..." : "Propose Trade"}
                </button>
              </div>
            </div>

            {/* Trade Block */}
            <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">
                  Trade Block
                </h3>
                <p className="text-xs text-gray-500">Players available for trade</p>
              </div>
              <div className="p-2 max-h-48 overflow-y-auto">
                {tradeBlock.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-3">No players on trade block</p>
                ) : (
                  <div className="space-y-1">
                    {tradeBlock.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1a1d24] border border-yellow-500/20"
                      >
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${POSITION_COLORS[player.playerPosition]}`}>
                          {player.playerPosition}
                        </span>
                        <div className="flex-1 min-w-0">
                          <PlayerNameLink
                            playerId={player.playerId}
                            playerName={player.playerName}
                            className="text-sm text-white hover:text-purple-400"
                          />
                          <p className="text-xs text-gray-500">{player.teamName}</p>
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
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
                  Your Watchlist
                </h3>
              </div>
              <div className="p-2 max-h-48 overflow-y-auto">
                {watchlist.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-3">No players on watchlist</p>
                ) : (
                  <div className="space-y-1">
                    {watchlist.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1a1d24] border border-blue-500/20"
                      >
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${POSITION_COLORS[player.playerPosition]}`}>
                          {player.playerPosition}
                        </span>
                        <PlayerNameLink
                          playerId={player.playerId}
                          playerName={player.playerName}
                          className="text-sm text-white hover:text-purple-400"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Trades Tab */}
      {activeTab === "incoming" && (
        <div className="space-y-4">
          {incomingTrades.length === 0 ? (
            <div className="bg-[#252830] rounded-xl border border-gray-700 p-8 text-center">
              <p className="text-gray-400">No pending trade offers</p>
            </div>
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

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {historyTrades.length === 0 ? (
            <div className="bg-[#252830] rounded-xl border border-gray-700 p-8 text-center">
              <p className="text-gray-400">No trade history</p>
            </div>
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
  getTeamLabel: (id: string) => string;
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
    <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded text-xs font-medium border ${statusStyle}`}>
            {trade.status}
          </span>
          <span className="text-sm text-gray-400">
            {new Date(trade.createdAt).toLocaleDateString()}
          </span>
          {isProposer && <span className="text-xs text-purple-400">(You proposed)</span>}
        </div>
        <div className="flex items-center gap-2">
          {trade.participants.map((p) => (
            <span
              key={p.memberId}
              className={`text-xs px-2 py-1 rounded ${
                p.decision === "accepted"
                  ? "bg-green-500/20 text-green-400"
                  : p.decision === "declined"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {p.teamName || p.userName}: {p.decision}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* What you give */}
          <div>
            <p className="text-xs text-red-400 font-medium mb-2">
              {isProposer ? "YOU GIVE" : `${getTeamLabel(trade.proposerMemberId)} GIVES`}
            </p>
            <div className="space-y-1">
              {(isProposer ? itemsIGive : trade.items.filter((i) => i.fromMemberId === trade.proposerMemberId)).map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1a1d24]"
                  >
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${POSITION_COLORS[item.playerPosition]}`}>
                      {item.playerPosition}
                    </span>
                    <PlayerNameLink
                      playerId={item.playerId}
                      playerName={item.playerName}
                      className="text-sm text-white hover:text-purple-400"
                    />
                  </div>
                )
              )}
            </div>
          </div>

          {/* What you receive */}
          <div>
            <p className="text-xs text-green-400 font-medium mb-2">
              {isProposer ? "YOU RECEIVE" : "YOU GIVE"}
            </p>
            <div className="space-y-1">
              {(isProposer ? itemsIReceive : trade.items.filter((i) => i.toMemberId === trade.proposerMemberId)).map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1a1d24]"
                  >
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${POSITION_COLORS[item.playerPosition]}`}>
                      {item.playerPosition}
                    </span>
                    <PlayerNameLink
                      playerId={item.playerId}
                      playerName={item.playerName}
                      className="text-sm text-white hover:text-purple-400"
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && trade.status === "proposed" && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700">
            {isRecipientPending && (
              <>
                <button
                  onClick={onAccept}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  onClick={onDecline}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Decline
                </button>
              </>
            )}
            {isProposer && (
              <button
                onClick={onCancel}
                disabled={isPending}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel Trade
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
