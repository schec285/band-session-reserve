import { z } from "zod";

export const PartSchema = z.enum([
  "readGuitar",
  "backingGuitar",
  "bass",
  "drums",
  "keyboard",
  "vocal",
  "other",
]);

export type Part = z.infer<typeof PartSchema>;

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  token: z.string().optional(),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
