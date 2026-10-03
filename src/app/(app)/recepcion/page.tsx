import { getSession } from "@/server/session";
import { listLocalidadesSeguro } from "@/server/services/localidades";
import { listRecorridos } from "@/server/services/recorridos";
import { listSectoresSeguro } from "@/server/services/sectores";
import type { RecorridoBackend } from "@/types";
import { RecepcionView } from "./recepcion-view";
import { recorridosOfrecidos, sectoresPorLocalidad } from "./recepcion-catalogos";

// Recepción (rediseño del 2026-10-02): una pantalla de escaneo con modo
// fijo por tanda -- Sólo recibir, Cambiar sector, Reservar recorrido. Cada
// lectura es UNA llamada al backend (POST /custodia/recepcion, o POST
// /custodia/asignaciones para quien no recibe); ya no hay búsqueda previa.
// Ver recepcion-view.tsx y recepcion-tanda.ts.
//
// Los catálogos solo alimentan los selectores de los dos modos de cambio y
// son best-effort: si el usuario no puede leerlos, la pantalla carga igual
// y "Sólo recibir" funciona.
async function listRecorridosSeguro(): Promise<RecorridoBackend[]> {
  try {
    return await listRecorridos();
  } catch (err) {
    console.error(
      "No se pudo cargar GET /recorridos (Recepción sigue funcionando, sin recorridos para reservar):",
      err
    );
    return [];
  }
}

export default async function RecepcionPage() {
  const session = await getSession();
  const permisos = session?.permisos ?? [];
  const asigna = permisos.includes("custodia:asignar");
  const recibe = permisos.includes("custodia:registrar");

  // Quien no puede asignar (el chofer) no necesita ningún catálogo.
  const [sectores, localidades, recorridos] = asigna
    ? await Promise.all([listSectoresSeguro(), listLocalidadesSeguro(), listRecorridosSeguro()])
    : [[], [], []];

  return (
    <RecepcionView
      permisos={permisos}
      usuarioId={session?.usuarioId ?? ""}
      sectores={sectoresPorLocalidad(sectores, localidades)}
      recorridos={recorridosOfrecidos(recorridos, { recibe, puntoId: session?.puntoId ?? "" })}
    />
  );
}
