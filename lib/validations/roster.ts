import { z } from "zod";

export const movePlayerSchema = z.object({
  leagueId: z.string().min(1, "League ID is required"),
  rosterPlayerId: z.string().min(1, "Roster player ID is required"),
  targetSlot: z.string().min(1, "Target slot is required"),
});

export const pickupPlayerSchema = z.object({
  leagueId: z.string().min(1, "League ID is required"),
  playerId: z.string().min(1, "Player ID is required"),
});

export const dropAndAddSchema = z.object({
  leagueId: z.string().min(1, "League ID is required"),
  dropRosterPlayerId: z.string().min(1, "Drop roster player ID is required"),
  addPlayerId: z.string().min(1, "Add player ID is required"),
});

export type MovePlayerInput = z.infer<typeof movePlayerSchema>;
export type PickupPlayerInput = z.infer<typeof pickupPlayerSchema>;
export type DropAndAddInput = z.infer<typeof dropAndAddSchema>;
