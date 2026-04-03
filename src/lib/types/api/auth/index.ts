import { z } from "zod";

export const UserRoleSchema = z.enum(["member", "admin"]);

export type UserRole = z.infer<typeof UserRoleSchema>;
