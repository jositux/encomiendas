"use server";

import * as db from "../db";
import { revalidateAll } from "./shared";
import type { CierreCaja } from "@/types";

// -- Cajas --------------------------------------------------------------------------
// Mock (src/server/db.ts) — etapa 2 del backend, sin endpoint todavía. No
// tocar salvo instrucción explícita del usuario (ver restricciones en
// claude/plan-integracion-backend.md).

export async function createCierreCajaAction(data: Omit<CierreCaja, "id">) {
  const item = await db.createCierreCaja(data);
  revalidateAll();
  return item;
}
export async function updateCierreCajaAction(id: string, patch: Partial<CierreCaja>) {
  await db.updateCierreCaja(id, patch);
  revalidateAll();
}
