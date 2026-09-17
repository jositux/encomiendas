"use server";

import * as db from "../db";
import { revalidateAll } from "./shared";
import type { MovimientoCrr } from "@/types";

// -- CRR ------------------------------------------------------------------------------
// Mock (src/server/db.ts) — etapa 2 del backend, sin endpoint todavía. No
// tocar salvo instrucción explícita del usuario.

export async function updateMovimientoCrrAction(id: string, patch: Partial<MovimientoCrr>) {
  await db.updateMovimientoCrr(id, patch);
  revalidateAll();
}
