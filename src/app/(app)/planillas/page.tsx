import { getSession } from "@/server/session";
import { listDespachos } from "@/server/services/custodia";
import { listLocalidades } from "@/server/services/localidades";
import { PlanillasView } from "./planillas-view";

// NOTA-2026-09-28-03 (menús por rol): pantalla nueva del operador con todo
// lo que antes usaba dentro de /chofer para trabajar con planillas --
// buscar por código, buscar por Despacho + Localidad de destino (gateado
// por `despachos:leer`, mismo criterio que tenía chofer/page.tsx antes de
// NOTA-2026-09-28-01/03 -- ver `git show c241a87^`), y el detalle con
// Cargar/Recibir. Las acciones por envío (Entregar/Intento fallido/
// Incidencia) siguen gateadas por `entregas:registrar` dentro de
// PlanillaDetalle/EnvioDePlanillaRow -- el operador no lo tiene, así que
// no las ve, igual que hoy.
export default async function PlanillasPage() {
  const session = await getSession();
  const puedeVerDespachos = !!session?.permisos.includes("despachos:leer");

  const [despachos, localidades] = await Promise.all([
    puedeVerDespachos ? listDespachos() : Promise.resolve([]),
    puedeVerDespachos ? listLocalidades() : Promise.resolve([]),
  ]);

  return (
    <PlanillasView
      despachos={despachos}
      localidades={localidades}
      puedeVerDespachos={puedeVerDespachos}
      permisos={session?.permisos ?? []}
    />
  );
}
