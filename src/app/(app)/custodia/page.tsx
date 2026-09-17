import { listEnvios } from "@/server/services/envios";
import { listUsuariosSeguro } from "@/server/services/usuarios";
import { listPuntosSeguro } from "@/server/services/puntos";
import { CustodiaView } from "./custodia-view";

// Trazabilidad de custodia: quién tiene cada envío ahora mismo y en qué
// punto. Usa /envios real (el mismo endpoint real ya usado en "Envíos
// recientes" de Nueva Encomienda) — el resto de la app (Tablero, Encomiendas
// activas, etc.) todavía corre sobre el mock, así que esta es la segunda
// pantalla conectada al backend real.
//
// 2026-09-15: mismo bug que en Seguimiento (sección 18.2 del plan de
// integración) — un rol sin permiso de listar usuarios recibía 403 en
// GET /usuarios, adentro de este mismo Promise.all, y tiraba abajo TODA la
// pantalla. `usuarios` acá solo resuelve `custodiaActualUsuarioId` a un
// nombre (ya con fallback "—" en custodia-view.tsx), así que se cambió a
// `listUsuariosSeguro()`: si falla, la pantalla carga igual y esa columna
// muestra "—" para todos en vez de romper todo.
//
// 2026-09-17 (sección 27.1 del plan): mismo bug, esta vez con
// `listPuntos()` — confirmado en vivo que tanto `GET /puntos` en sí como
// la resolución interna de `localidadId` -> nombre (`GET /localidades`)
// exigen `geografia:leer`, permiso que un rol como chofer_obera no tiene, y
// eso tiraba abajo TODA la pantalla. Cambiado a `listPuntosSeguro()`
// (best-effort, ver services/puntos.ts): si falla, la pantalla carga igual
// y la columna de punto queda vacía en vez de romper todo.
export default async function CustodiaPage() {
  const [envios, usuarios, puntos] = await Promise.all([
    listEnvios({ limite: 100 }),
    listUsuariosSeguro(),
    listPuntosSeguro(),
  ]);
  return <CustodiaView envios={envios} usuarios={usuarios} puntos={puntos} />;
}
