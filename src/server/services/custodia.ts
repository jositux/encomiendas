import "server-only";

import { apiFetch, apiFetchColeccion, nuevoClientUuid } from "../api-client";
import { requireToken } from "./shared";

// Vista de chofer: Planilla (por código) -> Custodia (carga/recepcion) ->
// Entrega/Intento fallido/Incidencia por envío. Distinto de /custodia
// (ya conectada), que solo MUESTRA la foto actual de custodia (dato que ya
// trae `envio.custodiaActual*`); esto son las acciones que la CAMBIAN.
//
// Confirmado en vivo el 2026-09-17 con una página de debug temporal
// (/debug-planillas, borrada después de confirmar): GET /despachos y
// GET /planillas?despachoId=&localidadId=|sectorId= existen y devuelven
// datos reales.
//
// POST /entregas, POST /entregas/intentos y POST /incidencias — CONFIRMADO
// en vivo el 2026-09-17 con chofer_obera desde la UI real de /chofer
// (búsqueda de envío suelto, envío #9-3 / "000000009-3"): el body original
// (`envioId`, el id interno) fue RECHAZADO por el backend con 400 Bad
// Request: "property envioId should not exist; envioNumero must be a
// string". El campo correcto es `envioNumero` (el número legible del
// envío, ej. "000000009-3" — el mismo que devuelve `numero` en EnvioApi/
// EnvioDePlanillaApi), NO el id interno. Corregido en los 3 verbos de
// abajo y en sus 3 acciones (`entregarEnvioAction`,
// `registrarIntentoFallidoAction`, `registrarIncidenciaAction` en
// actions.ts) y sus call-sites en chofer-view.tsx (antes mandaban
// `envio.id`, ahora `envio.numero`). Con el campo corregido, los 3 verbos
// pasan la validación de DTO (ya no hay error de "property ... should not
// exist") y devuelven un error de NEGOCIO distinto y consistente: "Esto ya
// no esta en tus manos — el envio <id> no esta en custodia de <userId>"
// (403/409 según Bad Request Exception) — es decir, el backend exige que
// el envío esté actualmente en la custodia del usuario que ejecuta la
// acción (`custodiaActualUsuarioId` del envío == usuario autenticado).
// chofer_obera no tenía en su custodia ningún envío disponible en este
// ambiente de prueba (todos pertenecían a "Operador de Obera" u otro
// usuario) así que **no se pudo confirmar un 200 real todavía** — el shape
// del body sí quedó confirmado (pasa DTO), falta encontrar/crear un
// escenario donde chofer_obera sea el custodio actual (recibiendo una
// planilla que esté en estado "cargada", no "recibida") para confirmar la
// respuesta de éxito y la forma exacta que toma el estado del envío
// después. Ver sección 27 del plan de integración para más detalle.
// POST /custodia/carga y POST /custodia/recepcion (`cargarPlanilla` /
// `recibirPlanilla` abajo) siguen PENDIENTES DE CONFIRMAR de la misma
// forma — probar viendo el error real que devuelva el backend la primera
// vez que se disparen desde una planilla en un estado válido para esa
// transición (`cargarPlanilla` ya se probó una vez sobre una planilla
// "recibida" y el backend la rechazó correctamente con una regla de
// negocio clara: "una planilla en recibida no admite un acto de tipo
// carga" — confirma que el verbo en sí y su ruteo están bien, solo hace
// falta repetirlo sobre una planilla en el estado correcto).
//
// Corrección importante 2026-09-17 (misma sesión, más tarde, aviso directo
// del equipo de backend): `GET /despachos` y `GET /planillas` (listado por
// despachoId) son de uso de OFICINA — piden `despachos:leer` /
// `planillas:imprimir`, permisos que un chofer real NUNCA tiene por
// diseño (separación intencional: el chofer no necesita ver todos los
// despachos, solo la/s planilla/s que tiene en la mano). El chofer entra
// por el código de la planilla (QR o código corto) vía
// `GET /planillas/{codigo}` — permitido con `planillas:leer`, que el rol
// chofer sí tiene. Confirmado en vivo con una página de debug temporal
// (`/debug-planilla-codigo`, borrada después) usando la sesión real de
// `chofer_obera` (permisos: custodia:registrar, entregas:registrar,
// envios:leer, planillas:leer — sin despachos:leer, como corresponde).
// `getPlanillaPorCodigo()` abajo es el nuevo punto de entrada PRINCIPAL de
// la pantalla; `listDespachos()`/`listPlanillas()` quedan como una
// herramienta secundaria, solo para quien sí tenga permisos de oficina
// (ver chofer/page.tsx — ya no son una precondición para entrar a la
// pantalla).

export interface DespachoApi {
  id: string;
  recorridoId: string;
  recorridoNombre: string;
  puntoOrigenId: string;
  fecha: string;
  secuencia: number;
  disparadoPor: string;
  choferId: string | null;
  vehiculoId: string;
  planillas: number;
  envios: number;
}

export interface EnvioDePlanillaApi {
  id: string;
  numero: string;
  destinatarioNombre: string;
  destinatarioTelefono: string;
  destinatarioCalle: string;
  destinatarioNumero: string | null;
  destinatarioPiso: string | null;
  destinatarioReferencia: string | null;
  cantidadBultos: number;
  tipo: string;
  lugarPago: string;
  formaPago: string;
  fleteImporte: string;
}

export interface HistorialPlanillaApi {
  id: string;
  tipo: string;
  responsableUsuarioId: string;
  responsableNombre: string;
  puntoId: string;
  occurredAt: string;
  recordedAt: string;
}

export interface PlanillaApi {
  id: string;
  codigoQr: string;
  codigoCorto: string;
  despachoId: string;
  estado: string;
  sectorDestinoId: string;
  sectorDestinoNombre: string;
  localidadDestinoId: string;
  localidadDestinoNombre: string;
  envios: EnvioDePlanillaApi[];
  // Solo viene en GET /planillas/{codigo} (no en el listado por
  // despachoId) — confirmado en vivo el 2026-09-17. Opcional para no
  // romper el tipo donde no viene.
  historial?: HistorialPlanillaApi[];
}

export async function listDespachos(): Promise<DespachoApi[]> {
  const token = await requireToken();
  const pagina = await apiFetchColeccion<DespachoApi>("/despachos?limite=200", { token });
  return pagina.datos;
}

// Forma de la respuesta real de POST /despachos (201) — contrato pasado por
// el equipo de backend el 2026-09-18 (ver sección 32 del plan de
// integración), tampoco publicado con detalle en /docs-json (que hoy solo
// dice `201 -> type: object`, igual que /custodia/recepcion). El backend
// barre toda la carga REGISTRADA de la base del recorrido para las
// localidades que sirve y la reparte en una planilla por sector de destino.
// Puede volver `planillas: []` si no había nada pendiente (el camión "sale
// vacío") — no es un error.
export interface PlanillaGenerada {
  id: string;
  codigoQr: string;
  codigoCorto: string;
  envios: number;
}

export interface RespuestaDespacho {
  // El shape completo de `despacho` no se detalló en el contrato que pasó
  // el backend (solo confirmaron `id`) — se deja abierto (`[key: string]:
  // unknown`) en vez de inventar campos que después no vengan.
  despacho: { id: string; [key: string]: unknown };
  planillas: PlanillaGenerada[];
}

// Corte: crea un despacho para un recorrido y reparte su carga pendiente en
// planillas por sector. `vehiculoId`/`choferId` son opcionales — sin
// mandarlos, el backend usa los predeterminados del recorrido
// (`vehiculoPredeterminadoId`/`choferPredeterminadoId`, ya resueltos a
// nombre en `RecorridoBackend` por listRecorridos()). No hace falta mandar
// fecha/hora, las pone el backend.
export async function crearDespacho(data: {
  recorridoId: string;
  vehiculoId?: string;
  choferId?: string;
}): Promise<RespuestaDespacho> {
  const token = await requireToken();
  return apiFetch<RespuestaDespacho>("/despachos", { method: "POST", token, body: data });
}

// GET /planillas exige despachoId + (localidadId O sectorId) — confirmado
// en vivo (400 explícito con ambos mensajes por separado al ir probando).
export async function listPlanillas(
  despachoId: string,
  filtro: { localidadId?: string; sectorId?: string }
): Promise<PlanillaApi[]> {
  const token = await requireToken();
  const qs = new URLSearchParams({ despachoId, limite: "200" });
  if (filtro.localidadId) qs.set("localidadId", filtro.localidadId);
  if (filtro.sectorId) qs.set("sectorId", filtro.sectorId);
  const pagina = await apiFetchColeccion<PlanillaApi>(`/planillas?${qs.toString()}`, { token });
  return pagina.datos;
}

// Punto de entrada principal del chofer (ver nota arriba): busca UNA
// planilla por su código (QR completo "PL-000000004" o código corto
// "TAUDR7" — confirmado en vivo que el código corto ya alcanza). Requiere
// `planillas:leer`, no `despachos:leer`/`planillas:imprimir`.
export async function getPlanillaPorCodigo(codigo: string): Promise<PlanillaApi> {
  const token = await requireToken();
  return apiFetch<PlanillaApi>(`/planillas/${encodeURIComponent(codigo.trim())}`, { token });
}

// -- Acciones de chofer (PENDIENTE DE CONFIRMAR contra el backend real) ----

// Confirmado en vivo el 2026-09-17: el body NO es `planillaId` (lo que
// decía la inferencia original por analogía con seguimiento.ts) — el
// backend rechazó con 400 "property planillaId should not exist;
// planillaCodigo should not be empty; planillaCodigo must be a string".
// El campo real es `planillaCodigo` (string) — se manda `codigoCorto`
// (ej. "TAUDR7"), el código corto legible que ya trae `PlanillaApi`.
export async function cargarPlanilla(planillaCodigo: string): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>("/custodia/carga", {
    method: "POST",
    token,
    body: { planillaCodigo, clientUuid: nuevoClientUuid(), occurredAt: new Date().toISOString() },
  });
}

export async function recibirPlanilla(planillaCodigo: string): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>("/custodia/recepcion", {
    method: "POST",
    token,
    body: { planillaCodigo, clientUuid: nuevoClientUuid(), occurredAt: new Date().toISOString() },
  });
}

// Forma de la respuesta real de POST /custodia/recepcion (201/200) — spec
// pasado por el equipo de backend el 2026-09-17 (ver sección 31 del plan
// de integración), no publicado todavía en el OpenAPI de /docs (que hoy
// solo dice `201 -> type: object`). `recibirPlanilla()` de arriba ignora
// este body porque nunca se usó; `recibirEnvioSuelto()` de abajo sí lo
// necesita para saber en qué quedó el envío sin tener que rebuscarlo.
export interface RespuestaCustodia {
  envio: {
    id: string;
    numero: string;
    estado: string;
    custodiaUsuarioId: string | null;
    custodiaPuntoId: string | null;
    ubicacion: string;
  };
  evento: {
    id: string;
    tipo: string;
    // true si `clientUuid` ya se había usado antes (reintento) — el
    // backend no generó un evento nuevo, devolvió 200 en vez de 201 con
    // el mismo estado de la vez anterior.
    duplicado: boolean;
  };
}

// Recepción de un envío SUELTO (sin pasar por una planilla): mismo
// endpoint que recibirPlanilla() (POST /custodia/recepcion) — el backend
// exige mandar exactamente uno de `planillaCodigo`/`envioNumero` (los dos
// o ninguno es 400 OBJETIVO_AMBIGUO). Confirmado por el equipo de backend
// el 2026-09-17 (sección 31 del plan): quien llama toma la custodia del
// envío, `estado` pasa a EN_CUSTODIA, sin chequeo de "tenencia" (cualquier
// usuario con `custodia:registrar` puede recibir un envío suelto de
// cualquier otro custodio) ni de alcance por punto. 404 si el número no
// existe (`ENVIO_NO_ENCONTRADO`), 409 si el envío no está en
// REGISTRADO/EN_CUSTODIA (ya ENTREGADO/CONFIRMADO/ANULADO). Un
// `envioNumero` con forma de UUID se rechaza con 400 antes de llegar al
// servicio (el contrato pide el número humano, nunca el id interno —
// mismo criterio que entregarEnvio/registrarIntentoFallido/
// registrarIncidencia de arriba).
export async function recibirEnvioSuelto(envioNumero: string): Promise<RespuestaCustodia> {
  const token = await requireToken();
  return apiFetch<RespuestaCustodia>("/custodia/recepcion", {
    method: "POST",
    token,
    body: { envioNumero, clientUuid: nuevoClientUuid(), occurredAt: new Date().toISOString() },
  });
}

export async function entregarEnvio(
  envioNumero: string,
  data: { recibidoPor?: string; documento?: string; observacion?: string }
): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>("/entregas", {
    method: "POST",
    token,
    body: {
      envioNumero,
      ...data,
      clientUuid: nuevoClientUuid(),
      occurredAt: new Date().toISOString(),
    },
  });
}

export async function registrarIntentoFallido(envioNumero: string, motivo: string): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>("/entregas/intentos", {
    method: "POST",
    token,
    body: { envioNumero, motivo, clientUuid: nuevoClientUuid(), occurredAt: new Date().toISOString() },
  });
}

export async function registrarIncidencia(
  envioNumero: string,
  data: { motivo: string; bultoNumero?: number; detalle?: string }
): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>("/incidencias", {
    method: "POST",
    token,
    body: {
      envioNumero,
      ...data,
      clientUuid: nuevoClientUuid(),
      occurredAt: new Date().toISOString(),
    },
  });
}
