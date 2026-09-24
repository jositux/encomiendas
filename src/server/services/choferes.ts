import "server-only";

import { apiFetchColeccion } from "../api-client";
import { requireToken } from "./shared";

// CONTRATO-2026-09-23-02 (backend): GET /choferes, endpoint acotado
// {id, nombre} por chofer activo, protegido con `despachos:leer` (no con
// `usuarios:leer`). Reemplaza a listUsuariosSeguro() como fuente del combo
// "Chofer (opcional, si hoy lo cubre otro)" en Despachos — ver
// despachos/page.tsx: ese combo usaba GET /usuarios, que 403 para el rol
// `operador` (no tiene `usuarios:leer`), rompiendo el override justo para
// el rol que más usa esta pantalla. Backend confirmó el gate real:
// `operador`/`supervisor`/`administracion` -> 200, `chofer` -> 403 (mismo
// motivo por el que sigue existiendo la variante "Segura" abajo: este
// combo es un override opcional, no el dato central de la pantalla).
export interface ChoferApi {
  id: string;
  nombre: string;
}

export async function listChoferes(): Promise<ChoferApi[]> {
  const token = await requireToken();
  // Catalogo: sin limite=200 explicito, el backend trunca a 50 (default).
  const pagina = await apiFetchColeccion<ChoferApi>("/choferes?limite=200", { token });
  return pagina.datos;
}

// Variante "best effort", mismo criterio que listUsuariosSeguro() (ver
// usuarios.ts): el combo que consume esto es un override opcional (sin
// tocarlo, el backend usa el chofer predeterminado del recorrido) — un 403
// acá no debería tumbar toda la pantalla de Despachos.
export async function listChoferesSeguro(): Promise<ChoferApi[]> {
  try {
    return await listChoferes();
  } catch (err) {
    console.error(
      "No se pudo cargar GET /choferes (Despachos sigue funcionando, pero sin el combo de override de chofer):",
      err
    );
    return [];
  }
}
