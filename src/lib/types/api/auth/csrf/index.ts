import { z } from "zod";

export const CsrfResponseSchema = z.object({
  csrfToken: z.string(),
});

export type CsrfResponse = z.infer<typeof CsrfResponseSchema>;
