"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getPlayerCardDataAction } from "@/lib/actions/player-card";
import { dropPlayerAction } from "@/lib/actions/roster";
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

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`text-left hover:text-indigo-600 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit ${
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
        />
      )}
    </>
  );
}
