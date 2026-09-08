"use server";

import { cookies } from "next/headers";
import { getPersonal } from "./db";
import { SESSION_COOKIE } from "./session";
import type { SesionUsuario } from "@/types";

// Login solo de demostración: cualquier DNI o alias que exista en la nómina
// de personal, junto con cualquier contraseña no vacía, inicia sesión. No
// hay backend de autenticación real detrás de esto.
export async function login(
  usuario: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!usuario.trim() || !password.trim()) {
    return { ok: false, error: "Ingresá usuario y contraseña." };
  }

  const personal = await getPersonal();
  const persona =
    personal.find((p) => p.dni === usuario.trim()) ??
    personal.find((p) => p.alias.toLowerCase() === usuario.trim().toLowerCase()) ??
    personal[0];

  if (!persona) {
    return { ok: false, error: "No hay personal cargado para iniciar sesión." };
  }

  const session: SesionUsuario = {
    personalId: persona.id,
    nombre: persona.apellidoNombre,
    sucursalId: persona.sucursalId,
    tipoPersonal: persona.tipoPersonal,
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return { ok: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
