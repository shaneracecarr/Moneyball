export type WaiverType = "none" | "standard" | "faab";

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
  // Waiver settings
  waiverType: WaiverType;
  faabBudget: number | null; // Only used when waiverType is "faab"
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
  // Waiver defaults - standard waivers for regular leagues
  waiverType: "standard",
  faabBudget: null,
};

// Mock leagues don't have waivers - always free agency
export const MOCK_LEAGUE_SETTINGS: LeagueSettings = {
  ...DEFAULT_LEAGUE_SETTINGS,
  waiverType: "none",
  faabBudget: null,
};
