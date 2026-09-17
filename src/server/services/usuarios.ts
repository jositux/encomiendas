import "server-only";

import { apiFetchColeccion } from "../api-client";
import { requireToken } from "./shared";

// Forma cruda de GET /usuarios. Se usa hoy solo como fuente para elegir
// chofer en Vehículos/Recorridos — no hay todavía una pantalla de
// administración de usuarios/roles en el frontend (queda para más adelante).
export interface UsuarioApi {
  id: string;
  nombre: string;
  username: string;
  activo: boolean;
  puntoId: string;
  tipoChofer: "propio" | "tercero" | null;
  roles: { codigo: string }[];
}

export async function listUsuarios(): Promise<UsuarioApi[]> {
  const token = await requireToken();
  // Catalogo: sin limite=200 explicito, el backend trunca a 50 (default).
  const pagina = await apiFetchColeccion<UsuarioApi>("/usuarios?limite=200", { token });
  return pagina.datos;
}

// Variante "best effort": el backend confirmó (2026-09-15, ver sección 18.2
// del plan de integración) que un rol sin permiso para listar todos los
// usuarios recibe 403 en GET /usuarios — y varias pantallas (Seguimiento,
// Custodia, Rutas/Recorridos) llamaban a listUsuarios() sin manejo de error,
// adentro de un Promise.all que arma toda la página: un 403 ahí tiraba abajo
// la pantalla ENTERA para ese rol (error de Server Components sin detalle en
// producción). En todos esos casos el resultado solo se usa para resolver un
// id a un nombre (chofer, responsable, etc.) con un fallback tipo
// `map.get(id) ?? "—"` — nunca es indispensable para que la pantalla cargue.
// Por eso esta variante nunca tira: si listUsuarios() falla, devuelve []
// (con un console.error para que quede rastro) y quien la use sigue
// funcionando, solo que sin poder resolver nombres de usuario.
export async function listUsuariosSeguro(): Promise<UsuarioApi[]> {
  try {
    return await listUsuarios();
  } catch (err) {
    console.error(
      "No se pudo cargar GET /usuarios (la pantalla sigue funcionando, pero sin nombres de usuario/chofer donde correspondan):",
      err
    );
    return [];
  }
}
