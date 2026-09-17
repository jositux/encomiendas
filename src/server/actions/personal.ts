"use server";

import * as db from "../db";
import { revalidateAll } from "./shared";
import type { Personal } from "@/types";

// -- Personal -------------------------------------------------------------------
// Mock (src/server/db.ts) — sin endpoint real todavía.

export async function createPersonalAction(data: Omit<Personal, "id">) {
  const item = await db.createPersonal(data);
  revalidateAll();
  return item;
}
export async function updatePersonalAction(id: string, patch: Partial<Personal>) {
  await db.updatePersonal(id, patch);
  revalidateAll();
}
export async function removePersonalAction(id: string) {
  await db.removePersonal(id);
  revalidateAll();
}
