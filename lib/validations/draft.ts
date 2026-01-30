import { z } from "zod";

export const setupDraftSchema = z.object({
  leagueId: z.string().min(1, "League ID is required"),
  numberOfRounds: z.number().int().min(1).max(20).default(15),
  scheduledAt: z.date().optional(),
});

export const makePickSchema = z.object({
  draftId: z.string().min(1, "Draft ID is required"),
  playerId: z.string().min(1, "Player ID is required"),
});

export type SetupDraftInput = z.infer<typeof setupDraftSchema>;
export type MakePickInput = z.infer<typeof makePickSchema>;
