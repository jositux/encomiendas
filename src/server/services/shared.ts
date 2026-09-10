import "server-only";

import { getToken } from "../session";

// Helper compartido por los servicios de src/server/services/*: todos pegan
// contra la API real y todos necesitan el JWT de la sesión actual. Centralizar
// esto evita repetir el mismo chequeo (y el mismo mensaje de error) en cada
// servicio.
export async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token) {
    throw new Error("No hay sesión activa.");
  }
  return token;
}
