import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createLeagueSchema = z.object({
  name: z.string().min(1, "League name is required").max(100, "League name is too long"),
  numberOfTeams: z.number().int().min(8).max(16),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;
