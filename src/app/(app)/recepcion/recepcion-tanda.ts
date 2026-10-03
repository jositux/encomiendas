// Lógica pura de la pantalla Recepción (2026-10-02): los modos de una
// tanda, la cola de lecturas, cómo se clasifica cada resultado y cómo se
// guarda la tanda en el navegador. Nada acá depende de React ni del DOM:
// es la parte que se prueba sin montar la pantalla.

import type {
  AsignacionApi,
  AsignacionPedida,
  EnvioRecibidoApi,
  RespuestaDeRecepcion,
} from "@/server/services/custodia";
import type { ResultadoDeRecepcion } from "@/server/actions/recepcion";

// -- Modos -------------------------------------------------------------------
// Una decisión por tanda, no por paquete: el operador elige qué hace cada
// escaneo y después solo escanea.
export type TipoDeModo = "recibir" | "sector" | "recorrido";

export interface Modo {
  tipo: TipoDeModo;
  // El sector o el recorrido elegido. null en "recibir", y en los otros dos
  // mientras no se eligió (ahí no se puede escanear).
  valor: { id: string; nombre: string } | null;
}

// Qué modos ve cada usuario lo deciden dos permisos:
// - `custodia:registrar` (operador, chofer): puede recibir.
// - `custodia:asignar` (operador, supervisor): puede cambiar el sector o
//   reservar el recorrido.
// Con los dos, los tres modos. Solo con el primero (chofer): "Sólo
// recibir". Solo con el segundo (supervisor): los dos modos de cambio, que
// entonces no reciben -- aplican el cambio a lo que ya está en su tenencia.
export function modosDisponibles(permisos: string[]): TipoDeModo[] {
  const recibe = permisos.includes("custodia:registrar");
  const asigna = permisos.includes("custodia:asignar");
  return [
    ...(recibe ? (["recibir"] as const) : []),
    ...(asigna ? (["sector", "recorrido"] as const) : []),
  ];
}

export function modoInicial(permisos: string[]): Modo | null {
  const [primero] = modosDisponibles(permisos);
  return primero ? { tipo: primero, valor: null } : null;
}

export function modoListo(modo: Modo): boolean {
  return modo.tipo === "recibir" || modo.valor !== null;
}

// El modo activo, para leerlo en grande arriba del campo.
export function leyendaDelModo(modo: Modo, recibe: boolean): string {
  if (modo.tipo === "recibir") return "Recibiendo";
  const verbo = recibe ? "Recibiendo → " : "";
  if (modo.tipo === "sector") {
    return modo.valor
      ? `${verbo}${recibe ? "sector" : "Cambiando el sector a"} ${modo.valor.nombre}`
      : "Elegí el sector para empezar";
  }
  return modo.valor
    ? `${verbo}${recibe ? "reservado para" : "Reservando para"} ${modo.valor.nombre}`
    : "Elegí el recorrido para empezar";
}

export function asignacionDelModo(modo: Modo): AsignacionPedida | undefined {
  if (modo.tipo === "recibir" || !modo.valor) return undefined;
  return modo.tipo === "sector" ? { sectorId: modo.valor.id } : { recorridoId: modo.valor.id };
}

// -- Lecturas ----------------------------------------------------------------
export type Tono = "correcto" | "aviso" | "error";

export interface ResultadoDeLectura {
  tono: Tono;
  titulo: string;
  detalle?: string;
  envio?: EnvioRecibidoApi;
  recepcion?: "recibido" | "ya_en_custodia";
  asignacion?: AsignacionApi | null;
  // No hubo respuesta del servidor: se puede reintentar con el mismo
  // clientUuid sin riesgo de duplicar nada.
  reintentable?: boolean;
  // La asignación de esta lectura se deshizo (volvió al valor anterior).
  deshecha?: boolean;
}

export interface Lectura {
  // Es también el `clientUuid` del pedido: un reintento manda el mismo.
  id: string;
  texto: string;
  // Hora del escaneo, no del envío: es el `occurredAt` del pedido.
  hora: string;
  // El modo con el que se escaneó. Cambiar de modo con lecturas en cola no
  // las afecta.
  modo: Modo;
  // true si esta lectura no recibe, solo asigna (usuario sin
  // `custodia:registrar`).
  soloAsignar: boolean;
  estado: "en_cola" | "hecha";
  resultado?: ResultadoDeLectura;
}

export function nuevaLectura(
  texto: string,
  modo: Modo,
  soloAsignar: boolean,
  id: string,
  ahora: Date = new Date()
): Lectura {
  return { id, texto, hora: ahora.toISOString(), modo, soloAsignar, estado: "en_cola" };
}

// Antirrebote: los lectores de mano a veces leen dos veces el mismo código
// de un tirón. Una lectura IDÉNTICA a la inmediatamente anterior, dentro de
// esta ventana, es un rebote: se descarta en silencio (sin llamada, sin
// fila, sin sonido). Pasada la ventana, o con otra lectura en el medio, se
// procesa normal (y el backend responderá "ya lo tenías").
export const VENTANA_DE_REBOTE_MS = 2000;

export function esRebote(tanda: Tanda, texto: string, ahora: Date = new Date()): boolean {
  const [anterior] = tanda.lecturas;
  if (!anterior || anterior.texto !== texto) return false;
  const transcurrido = ahora.getTime() - new Date(anterior.hora).getTime();
  return transcurrido >= 0 && transcurrido < VENTANA_DE_REBOTE_MS;
}

export function pedidoDeLectura(lectura: Lectura) {
  return {
    envioNumero: lectura.texto,
    clientUuid: lectura.id,
    occurredAt: lectura.hora,
    asignacion: asignacionDelModo(lectura.modo),
    soloAsignar: lectura.soloAsignar,
  };
}

function nombreAsignado(lectura: Lectura): string {
  return lectura.modo.valor?.nombre ?? "";
}

// Qué pasó con una lectura, en palabras y con su tono:
// - correcto: se hizo lo que el modo pedía.
// - aviso:    el paquete está, pero no pasó lo esperado -- ya lo tenías
//             (en "Sólo recibir"), se recibió y el cambio no se aplicó, o
//             el cambio de sector se aplicó pero de paso borró una reserva
//             de recorrido (un efecto que el operador no pidió).
// - error:    no se hizo nada -- no encontrado, rechazado, sin respuesta.
export function resultadoDeRespuesta(
  lectura: Lectura,
  respuesta: ResultadoDeRecepcion
): ResultadoDeLectura {
  if (!respuesta.ok) {
    const noEncontrado = respuesta.status === 404 || respuesta.code === "ENVIO_NO_ENCONTRADO";
    return {
      tono: "error",
      titulo: noEncontrado ? "No encontrado" : respuesta.title,
      detalle: noEncontrado ? undefined : respuesta.message,
    };
  }

  const { envio, recepcion, asignacion }: RespuestaDeRecepcion = respuesta.data;
  const base = { envio, recepcion, asignacion };
  const yaLoTenia = recepcion === "ya_en_custodia";
  const recibio = recepcion === "recibido";

  if (!asignacion) {
    return yaLoTenia
      ? { ...base, tono: "aviso", titulo: "Ya lo tenías" }
      : { ...base, tono: "correcto", titulo: "Recibido" };
  }

  const hecho =
    asignacion.tipo === "sector"
      ? `sector ${nombreAsignado(lectura)}`
      : `reservado para ${nombreAsignado(lectura)}`;

  if (asignacion.aplicada) {
    const titulo = recibio
      ? `Recibido · ${hecho}`
      : asignacion.tipo === "sector"
        ? `Sector cambiado a ${nombreAsignado(lectura)}`
        : `Reservado para ${nombreAsignado(lectura)}`;
    const quitada = asignacion.reservaQuitada;
    return quitada
      ? { ...base, tono: "aviso", titulo: `${titulo} · se quitó la reserva de ${quitada.nombre}` }
      : { ...base, tono: "correcto", titulo };
  }

  const sinCambio =
    asignacion.tipo === "sector" ? "sin cambiar el sector" : "sin reservar el recorrido";
  return {
    ...base,
    tono: "aviso",
    titulo: recibio ? `Recibido, ${sinCambio}` : `Ya lo tenías, ${sinCambio}`,
    detalle: asignacion.mensaje,
  };
}

export function resultadoSinRespuesta(): ResultadoDeLectura {
  return {
    tono: "error",
    titulo: "Sin respuesta",
    detalle: "No se pudo comunicar con el servidor. Reintentá: no se duplica.",
    reintentable: true,
  };
}

// Se puede deshacer la asignación de una lectura si se aplicó, cambió algo
// y todavía no se deshizo. La recepción no se deshace.
//
// "Cambió algo": pedir el sector o el recorrido que el envío ya tenía
// vuelve como aplicada, con `anterior` igual al valor pedido y sin evento
// en el historial. Ahí no hay nada que deshacer.
export function sePuedeDeshacer(lectura: Lectura): boolean {
  const r = lectura.resultado;
  if (!r?.asignacion?.aplicada || r.deshecha || !r.envio) return false;
  const anterior = r.asignacion.anterior;
  if (r.asignacion.tipo === "sector" && !anterior) return false;
  return anterior?.id !== lectura.modo.valor?.id;
}

// Deshacer vuelve al valor `anterior`. Si no había reserva de recorrido,
// `recorridoId: null` la quita.
export function asignacionParaDeshacer(lectura: Lectura): AsignacionPedida | null {
  const asignacion = lectura.resultado?.asignacion;
  if (!asignacion || !sePuedeDeshacer(lectura)) return null;
  if (asignacion.tipo === "sector") {
    return asignacion.anterior ? { sectorId: asignacion.anterior.id } : null;
  }
  return { recorridoId: asignacion.anterior?.id ?? null };
}

// -- La tanda ----------------------------------------------------------------
export interface Tanda {
  modo: Modo | null;
  // La más nueva primero.
  lecturas: Lectura[];
  silencio: boolean;
}

export function tandaVacia(permisos: string[]): Tanda {
  return { modo: modoInicial(permisos), lecturas: [], silencio: false };
}

export function conLectura(tanda: Tanda, lectura: Lectura): Tanda {
  return { ...tanda, lecturas: [lectura, ...tanda.lecturas] };
}

export function conResultado(tanda: Tanda, id: string, resultado: ResultadoDeLectura): Tanda {
  return {
    ...tanda,
    lecturas: tanda.lecturas.map((l) => (l.id === id ? { ...l, estado: "hecha", resultado } : l)),
  };
}

// Una lectura que vuelve a la cola (reintento): conserva su id, su hora y
// su modo, así el pedido es exactamente el mismo.
export function otraVezEnCola(tanda: Tanda, id: string): Tanda {
  return {
    ...tanda,
    lecturas: tanda.lecturas.map((l) =>
      l.id === id ? { ...l, estado: "en_cola", resultado: undefined } : l
    ),
  };
}

export function conDeshecha(tanda: Tanda, id: string): Tanda {
  return {
    ...tanda,
    lecturas: tanda.lecturas.map((l) =>
      l.id === id && l.resultado ? { ...l, resultado: { ...l.resultado, deshecha: true } } : l
    ),
  };
}

// Las lecturas en cola, en el orden en que se escanearon.
export function enCola(tanda: Tanda): Lectura[] {
  return tanda.lecturas.filter((l) => l.estado === "en_cola").reverse();
}

export interface ResumenDeTanda {
  recibidos: number;
  yaLosTenias: number;
  conAviso: number;
  conError: number;
  enCola: number;
}

export function resumenDeTanda(tanda: Tanda): ResumenDeTanda {
  const resumen = { recibidos: 0, yaLosTenias: 0, conAviso: 0, conError: 0, enCola: 0 };
  for (const l of tanda.lecturas) {
    if (l.estado === "en_cola") {
      resumen.enCola += 1;
      continue;
    }
    const r = l.resultado;
    if (!r) continue;
    if (r.recepcion === "recibido") resumen.recibidos += 1;
    if (r.recepcion === "ya_en_custodia") resumen.yaLosTenias += 1;
    if (r.tono === "aviso") resumen.conAviso += 1;
    if (r.tono === "error") resumen.conError += 1;
  }
  return resumen;
}

// -- Persistencia ------------------------------------------------------------
// La tanda sobrevive a una recarga: se guarda en el navegador, por usuario.
// Lo que estaba en cola al recargar se vuelve a mandar con su mismo
// clientUuid (el backend no lo duplica).
export function claveDeTanda(usuarioId: string): string {
  return `neo:recepcion:tanda:v1:${usuarioId}`;
}

export function serializarTanda(tanda: Tanda): string {
  return JSON.stringify(tanda);
}

// Lo guardado puede estar roto, ser de otra versión, o traer un modo que
// este usuario ya no tiene: ante cualquier duda, tanda vacía.
export function leerTanda(guardado: string | null, permisos: string[]): Tanda {
  const vacia = tandaVacia(permisos);
  if (!guardado) return vacia;
  try {
    const t = JSON.parse(guardado) as Partial<Tanda>;
    if (!t || !Array.isArray(t.lecturas)) return vacia;
    const disponibles = modosDisponibles(permisos);
    const modo = t.modo && disponibles.includes(t.modo.tipo) ? t.modo : vacia.modo;
    const lecturas = t.lecturas.filter(
      (l): l is Lectura => !!l && typeof l.id === "string" && typeof l.texto === "string" && !!l.modo
    );
    return { modo, lecturas, silencio: t.silencio === true };
  } catch {
    return vacia;
  }
}
