import { getSession } from "@/server/session";
import { listLoQueLleva } from "@/server/services/custodia";
import { ChoferView } from "./chofer-view";

// Vista de chofer: buscar una planilla por código (QR o código corto) ->
// Custodia (carga/recepción) -> Entrega/Intento fallido/Incidencia por
// envío. Ver src/server/services/custodia.ts y las secciones 25/26/27 del
// plan de integración para el detalle completo.
//
// 2026-09-28: se sacó de esta pantalla la búsqueda secundaria "por
// Despacho + Localidad" (`listDespachos()`/`listLocalidades()`, permisos
// de oficina `despachos:leer`/`geografia:leer`) a pedido explícito del
// usuario ("ocultar de la página de chofer lo de despacho y localidad").
// Supervisor y administración ya tienen su propia pantalla para eso
// (/despachos, /deposito — ver NOTA-2026-09-28-01 y landing.ts). El único
// punto de entrada a una planilla acá es BuscadorPlanillaPorCodigo
// (`GET /planillas/{codigo}`, requiere solo `planillas:leer`).
export default async function ChoferPage() {
  const session = await getSession();
  const usuarioId = session?.usuarioId ?? "";
  // 2026-10-02: "Lo que llevás". La carga inicial se hace acá; después de
  // cada acto la vista la vuelve a pedir.
  const loQueLleva = await listLoQueLleva(usuarioId);

  return (
    <ChoferView
      // 2026-09-17 (sección 29 del plan / claude/esquema-permisos.md): se
      // pasa para gatear en la UI Cargar/Recibir (custodia:registrar) y
      // Entregar/Intento/Incidencia (entregas:registrar).
      permisos={session?.permisos ?? []}
      // 2026-09-17 (sección 31 del plan): para decidir en BuscadorEnvioSuelto
      // si un envío EN_CUSTODIA ya está en mi custodia (mostrar Entregar/
      // Intento/Incidencia) o en la de otro (mostrar Recibir).
      usuarioId={usuarioId}
      loQueLlevaInicial={loQueLleva}
    />
  );
}
