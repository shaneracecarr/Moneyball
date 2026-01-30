export interface LeagueSettings {
  qbCount: number;
  rbCount: number;
  wrCount: number;
  teCount: number;
  flexCount: number;
  kCount: number;
  defCount: number;
  benchCount: number;
  irCount: number;
  scoringFormat: "standard" | "half_ppr" | "ppr";
  tradesEnabled: boolean;
  tradeDeadlineWeek: number | null;
  draftTimerSeconds: number;
}

export const DEFAULT_LEAGUE_SETTINGS: LeagueSettings = {
  qbCount: 1,
  rbCount: 2,
  wrCount: 2,
  teCount: 1,
  flexCount: 1,
  kCount: 1,
  defCount: 1,
  benchCount: 7,
  irCount: 2,
  scoringFormat: "standard",
  tradesEnabled: true,
  tradeDeadlineWeek: null,
  draftTimerSeconds: 120,
};
