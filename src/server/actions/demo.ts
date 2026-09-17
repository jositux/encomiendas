"use server";

import * as db from "../db";
import { revalidateAll } from "./shared";

// -- Demo -----------------------------------------------------------------------------
// Resetea TODO el dataset mock (db.ts / .data/db.json) al estado inicial.
// No toca el backend real.

export async function resetDemoDataAction() {
  await db.resetDemoData();
  revalidateAll();
}
