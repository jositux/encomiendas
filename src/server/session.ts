import "server-only";

import { cookies } from "next/headers";
import type { SesionUsuario } from "@/types";
import { apiFetch, ApiError } from "./api-client";

export const SESSION_COOKIE = "neo_session";

export async function getSession(): Promise<SesionUsuario | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    return await apiFetch<SesionUsuario>("/auth/yo", { token });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    console.error("No se pudo validar la sesión contra el backend:", err);
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}
