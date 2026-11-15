import { z } from "zod";
import type { DbClient } from "@/features/cart/quote";

export const profileInputSchema = z
  .object({ name: z.string().trim().min(1, "Enter your name.").max(80, "That name is too long.") })
  .strict();

export type ProfileInput = z.infer<typeof profileInputSchema>;

export async function updateProfile(
  db: DbClient,
  userId: string,
  input: ProfileInput,
): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { name: input.name } });
}
