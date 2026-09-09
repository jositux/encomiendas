"use server";

import { cookies } from "next/headers";
import { apiFetch, ApiError } from "./api-client";
import { SESSION_COOKIE } from "./session";

const SIETE_DIAS = 60 * 60 * 24 * 7;

const MENSAJES_ERROR: Record<string, string> = {
  CREDENCIALES_INVALIDAS: "Usuario o contraseña incorrectos.",
};

export async function login(
  usuario: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
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

  return { ok: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
