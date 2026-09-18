import { getSession } from "@/server/session";
import { listRecorridos } from "@/server/services/recorridos";
import { listVehiculos } from "@/server/services/vehiculos";
import { listUsuariosSeguro } from "@/server/services/usuarios";
import { DespachosView } from "./despachos-view";

// Feature A del pedido "Cortar / Crear despacho" (2026-09-18, ver sección 32
// del plan de integración): pantalla para que un operador (o supervisor/
// administración) corte la carga pendiente de una base en planillas, vía
// POST /despachos. Antes de esto no había ninguna acción en la UI para este
// paso — un envío nuevo quedaba REGISTRADO para siempre, sin entrar nunca a
// una planilla.
//
// Mismo criterio que /rutas (page.tsx de al lado, mismo patrón): recorridos
// y vehículos no se envuelven en "seguro" porque son el dato central de la
// pantalla (sin ellos no hay nada que cortar) — un 403 acá debería
// mostrarse, no esconderse. `usuarios` sí usa la variante `Seguro()`: es
// solo para el override opcional de "Chofer" (el default del recorrido ya
// alcanza sin este combo), no vale la pena que su 403 rompa toda la
// pantalla.
export default async function DespachosPage() {
  const session = await getSession();
  const [recorridos, vehiculos, usuarios] = await Promise.all([
    listRecorridos(),
    listVehiculos(),
    listUsuariosSeguro(),
  ]);
  const activos = recorridos.filter((r) => r.activo);
  return (
    <DespachosView
      recorridos={activos}
      vehiculos={vehiculos}
      usuarios={usuarios}
      // 2026-09-18: confirmado en vivo con chofer_obera (que no lo tiene) el
      // texto literal del 403 real de POST /despachos: "Tu usuario no tiene
      // el permiso despachos:crear." — primera confirmación de este string,
      // no estaba en claude/esquema-permisos.md todavía. Se pasa para
      // ocultar el botón "Cortar / Declarar salida" en vez de dejar que
      // quien no lo tiene lo vea habilitado y recién se entere al clickear
      // — mismo patrón puedeAccion() que el resto de la app. El resto de la
      // pantalla (elegir recorrido, ver los predeterminados) sigue visible
      // igual, porque GET /recorridos no pide este permiso.
      permisos={session?.permisos ?? []}
    />
  );
}
