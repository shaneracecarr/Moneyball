import { z } from "zod";

export const leagueSettingsSchema = z.object({
  qbCount: z.number().int().min(1).max(3),
  rbCount: z.number().int().min(1).max(4),
  wrCount: z.number().int().min(1).max(4),
  teCount: z.number().int().min(1).max(3),
  flexCount: z.number().int().min(0).max(3),
  kCount: z.number().int().min(0).max(2),
  defCount: z.number().int().min(0).max(2),
  benchCount: z.number().int().min(4).max(10),
  irCount: z.number().int().min(0).max(4),
  scoringFormat: z.enum(["standard", "half_ppr", "ppr"]),
  tradesEnabled: z.boolean(),
  tradeDeadlineWeek: z.number().int().min(1).max(17).nullable(),
  draftTimerSeconds: z.number().int().min(30).max(600),
  // Waiver settings
  waiverType: z.enum(["none", "standard", "faab"]),
  faabBudget: z.number().int().min(50).max(1000).nullable(),
});

export type LeagueSettingsFormData = z.infer<typeof leagueSettingsSchema>;
