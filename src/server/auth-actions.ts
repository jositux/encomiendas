"use server";

import { cookies } from "next/headers";
import { apiFetch, ApiError } from "./api-client";
import { SESSION_COOKIE } from "./session";
import { landingPathParaPermisos } from "@/lib/landing";
import type { SesionUsuario } from "@/types";

const SIETE_DIAS = 60 * 60 * 24 * 7;

const MENSAJES_ERROR: Record<string, string> = {
  CREDENCIALES_INVALIDAS: "Usuario o contraseña incorrectos.",
};

export async function login(
  usuario: string,
  password: string
): Promise<{ ok: boolean; error?: string; landingPath?: string }> {
  if (!usuario.trim() || !password.trim()) {
    return { ok: false, error: "Ingresá usuario y contraseña." };
  }

  let token: string;
  try {
    const respuesta = await apiFetch<{ token: string }>("/auth/login", {
      method: "POST",
      body: { username: usuario.trim(), password },
    });
    token = respuesta.token;
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, error: MENSAJES_ERROR[err.code] ?? err.message };
    }
    return {
      ok: false,
      error: "No se pudo conectar con el servidor. Probá de nuevo en un momento.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SIETE_DIAS,
  });

  // NOTA-2026-09-24-01: landing por rol. Reusamos el token que ya tenemos
  // (sin depender de la cookie recien seteada) para consultar la sesion y
  // decidir a donde aterriza. Si esto falla por lo que sea, no rompemos el
  // login -- landingPath queda en el default de siempre ("Nueva
  // encomienda", NOTA-2026-09-23-06).
  let landingPath = "/encomiendas/nueva";
  try {
    const sesion = await apiFetch<SesionUsuario>("/auth/yo", { token });
    landingPath = landingPathParaPermisos(sesion.permisos);
  } catch (err) {
    console.error("No se pudo resolver el landing por rol, uso el default:", err);
  }

  return { ok: true, landingPath };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
