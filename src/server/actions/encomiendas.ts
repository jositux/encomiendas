"use server";

import * as db from "../db";
import { revalidateAll } from "./shared";
import type { Encomienda } from "@/types";

// -- Encomiendas --------------------------------------------------------------
// Mock (src/server/db.ts) — el backend real todavía no expone Encomiendas
// como tal (ver claude/plan-integracion-backend.md).

export async function createEncomiendaAction(data: Omit<Encomienda, "id">) {
  const item = await db.createEncomienda(data);
  revalidateAll();
  return item;
}
export async function updateEncomiendaAction(id: string, patch: Partial<Encomienda>) {
  await db.updateEncomienda(id, patch);
  revalidateAll();
}
export async function removeEncomiendaAction(id: string) {
  await db.removeEncomienda(id);
  revalidateAll();
}
