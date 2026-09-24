import { getSession } from "@/server/session";
import { listRecorridos } from "@/server/services/recorridos";
import { listVehiculos } from "@/server/services/vehiculos";
import { listChoferesSeguro } from "@/server/services/choferes";
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
// mostrarse, no esconderse. `choferes` sí usa la variante `Seguro()`: es
// solo para el override opcional de "Chofer" (el default del recorrido ya
// alcanza sin este combo), no vale la pena que su 403 rompa toda la
// pantalla.
//
// 2026-09-24 (CONTRATO-2026-09-23-02): antes esta lista salía de
// listUsuariosSeguro() (GET /usuarios), que 403 para `operador` — el rol
// que más usa Despachos — dejando el combo siempre vacío para ese rol. El
// backend agregó GET /choferes acotado a {id, nombre} y protegido con
// `despachos:leer` en vez de `usuarios:leer`, así que ahora sí resuelve
// para `operador`/`supervisor`/`administracion`.
export default async function DespachosPage() {
  const session = await getSession();
  const [recorridos, vehiculos, choferes] = await Promise.all([
    listRecorridos(),
    listVehiculos(),
    listChoferesSeguro(),
  ]);
  const activos = recorridos.filter((r) => r.activo);
  // Nota 3 del equipo de backend (2026-09-18, ver GET /auth/yo): todo
  // selector cuyo dominio dependa del lugar se acota a `puntosEnAlcance`, y
  // nunca se ofrece una opción que el backend va a rechazar con 403. El
  // recorrido declara la base de la que sale (`baseId`); si `esGlobal` es
  // false, un operador de un depósito no debe ver en el combo un recorrido
  // que sale de otra base — si lo corta, estaría despachando carga ajena.
  // Con `esGlobal` true (supervisión/administración) no se filtra.
  const esGlobal = session?.esGlobal ?? false;
  const puntosEnAlcance = session?.puntosEnAlcance ?? [];
  const recorridosVisibles = esGlobal
    ? activos
    : activos.filter((r) => puntosEnAlcance.includes(r.baseId));
  // Para no confundir "no hay ningún recorrido activo" con "hay recorridos,
  // pero ninguno sale de tu base" — mismo espíritu de Nota 3: el usuario
  // tiene que entender por qué el combo está vacío, no asumir que nadie
  // cargó nunca un recorrido.
  const sinRecorridosPorAlcance =
    !esGlobal && activos.length > 0 && recorridosVisibles.length === 0;
  return (
    <DespachosView
      recorridos={recorridosVisibles}
      sinRecorridosPorAlcance={sinRecorridosPorAlcance}
      vehiculos={vehiculos}
      choferes={choferes}
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
