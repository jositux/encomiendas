import { getSession } from "@/server/session";
import { listDespachos } from "@/server/services/custodia";
import { listLocalidades } from "@/server/services/localidades";
import { ChoferView } from "./chofer-view";

// Vista de chofer: buscar una planilla por código (QR o código corto) ->
// Custodia (carga/recepción) -> Entrega/Intento fallido/Incidencia por
// envío. Ver src/server/services/custodia.ts y las secciones 25/26/27 del
// plan de integración para el detalle completo.
//
// 2026-09-17, corrección importante (aviso directo del equipo de backend,
// ver sección 27): esta pantalla NO debe exigir `despachos:leer` como
// precondición — ese es un permiso de OFICINA que un chofer real nunca
// tiene por diseño. El punto de entrada principal del chofer es la
// búsqueda por código de planilla (`GET /planillas/{codigo}`, requiere
// solo `planillas:leer`, que el rol chofer sí tiene) — ver
// `BuscadorPlanillaPorCodigo` en chofer-view.tsx. La búsqueda por
// despacho + localidad (`GET /despachos` + `GET /planillas?despachoId=`,
// listado) sigue existiendo como herramienta SECUNDARIA para quien sí
// tenga permisos de oficina (útil para supervisar, no para el chofer en
// la calle) — por eso acá se pide `listDespachos()` solo si el usuario
// tiene `despachos:leer`, nunca como bloqueo de toda la pantalla.
//
// Mismo cuidado con `listLocalidades()` (2026-09-17, encontrado al probar
// en vivo con chofer_obera): requiere `geografia:leer`, que el rol chofer
// TAMPOCO tiene, y acá solo se usa para el selector "Localidad de
// destino" de la búsqueda por despacho (herramienta de oficina) — así que
// se pide en las mismas condiciones que `listDespachos()`, nunca sin
// chequear primero.
export default async function ChoferPage() {
  const session = await getSession();
  const puedeVerDespachos = !!session?.permisos.includes("despachos:leer");

  const [despachos, localidades] = await Promise.all([
    puedeVerDespachos ? listDespachos() : Promise.resolve([]),
    puedeVerDespachos ? listLocalidades() : Promise.resolve([]),
  ]);

  return (
    <ChoferView
      despachos={despachos}
      localidades={localidades}
      puedeVerDespachos={puedeVerDespachos}
      // 2026-09-17 (sección 29 del plan / claude/esquema-permisos.md): se
      // pasa para gatear en la UI Cargar/Recibir (custodia:registrar) y
      // Entregar/Intento/Incidencia (entregas:registrar).
      permisos={session?.permisos ?? []}
      // 2026-09-17 (sección 31 del plan): para decidir en BuscadorEnvioSuelto
      // si un envío EN_CUSTODIA ya está en mi custodia (mostrar Entregar/
      // Intento/Incidencia) o en la de otro (mostrar Recibir).
      usuarioId={session?.usuarioId ?? ""}
    />
  );
}
