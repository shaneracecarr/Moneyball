"use client";

import { useEffect, useRef } from "react";
import { setActiveLeagueAction } from "@/lib/actions/roster";

interface SetActiveLeagueProps {
  leagueId: string;
  leagueName: string;
}

export function SetActiveLeague({ leagueId, leagueName }: SetActiveLeagueProps) {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    setActiveLeagueAction(leagueId, leagueName);
  }, [leagueId, leagueName]);

  return null;
}
