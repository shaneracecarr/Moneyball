"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getPlayerCardDataAction } from "@/lib/actions/player-card";
import { dropPlayerAction } from "@/lib/actions/roster";
import {
  addToTradeBlockAction,
  removeFromTradeBlockAction,
  addToWatchlistAction,
  removeFromWatchlistAction,
} from "@/lib/actions/trade-block";
import { PlayerCardModal, type PlayerCardData } from "./player-card-modal";

interface PlayerNameLinkProps {
  playerId: string;
  playerName: string;
  className?: string;
}

export function PlayerNameLink({ playerId, playerName, className }: PlayerNameLinkProps) {
  const [modalData, setModalData] = useState<PlayerCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [tradeBlockLoading, setTradeBlockLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const result = await getPlayerCardDataAction(playerId);
    if (result.player) {
      setModalData(result as PlayerCardData);
    }
    setLoading(false);
  }

  function handleClose() {
    setModalData(null);
  }

  function handleDrop() {
    if (!modalData?.rosterPlayerId || !modalData.activeLeagueId) return;
    setDropping(true);
    const formData = new FormData();
    formData.set("leagueId", modalData.activeLeagueId);
    formData.set("rosterPlayerId", modalData.rosterPlayerId);
    startTransition(async () => {
      await dropPlayerAction(formData);
      setDropping(false);
      setModalData(null);
      router.refresh();
    });
  }

  async function handleToggleTradeBlock() {
    if (!modalData?.activeLeagueId || !modalData.player.id) return;
    setTradeBlockLoading(true);

    if (modalData.isOnTradeBlock) {
      await removeFromTradeBlockAction(modalData.activeLeagueId, modalData.player.id);
      setModalData({ ...modalData, isOnTradeBlock: false });
    } else {
      await addToTradeBlockAction(modalData.activeLeagueId, modalData.player.id);
      setModalData({ ...modalData, isOnTradeBlock: true });
    }

    setTradeBlockLoading(false);
  }

  async function handleToggleWatchlist() {
    if (!modalData?.activeLeagueId || !modalData.player.id) return;
    setWatchlistLoading(true);

    if (modalData.isOnWatchlist) {
      await removeFromWatchlistAction(modalData.activeLeagueId, modalData.player.id);
      setModalData({ ...modalData, isOnWatchlist: false });
    } else {
      await addToWatchlistAction(modalData.activeLeagueId, modalData.player.id);
      setModalData({ ...modalData, isOnWatchlist: true });
    }

    setWatchlistLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`text-left hover:text-purple-400 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit ${
          className || ""
        }`}
      >
        {playerName}
      </button>
      {modalData && (
        <PlayerCardModal
          data={modalData}
          onClose={handleClose}
          onDrop={handleDrop}
          dropping={dropping || isPending}
          onToggleTradeBlock={handleToggleTradeBlock}
          onToggleWatchlist={handleToggleWatchlist}
          tradeBlockLoading={tradeBlockLoading}
          watchlistLoading={watchlistLoading}
        />
      )}
    </>
  );
}
