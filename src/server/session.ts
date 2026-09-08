import "server-only";

import { cookies } from "next/headers";
import type { SesionUsuario } from "@/types";

export const SESSION_COOKIE = "neo_session";

/**
 * Lee la sesión actual desde la cookie httpOnly. Solo se puede usar en
 * Server Components, Server Actions y Route Handlers.
 */
export async function getSession(): Promise<SesionUsuario | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SesionUsuario;
  } catch {
    return null;
  }
}
