import "server-only";

import { apiFetch, apiFetchColeccion } from "../api-client";
import { requireToken } from "./shared";
import { listLocalidades } from "./localidades";
import { listSectores } from "./sectores";

// El backend real modela cliente + domicilio, pero NO como entidades
// separadas: cada cliente tiene exactamente UN domicilio, embebido como
// campos planos del propio cliente (localidadId/sectorId/calle/numero/piso/
// referencia), no un array `domicilios[]` con id propio. Para Nueva
// Encomienda no hace falta tener un Cliente real: remitente/destinatario
// del envio son value objects sueltos (ver envios.ts) — el cliente es solo
// un atajo opcional para autocompletar datos repetidos.
//
// Confirmado en vivo (GET /clientes sin `q`, 2026-09-10): en ese momento la
// respuesta cruda traia `domicilios: DomicilioApi[]` (con id/etiqueta/
// esPredeterminado propios). **Cambio de backend confirmado en vivo el
// 2026-09-11** (reportado por el usuario: "el cliente quedó con una sóla
// dirección en la misma entidad") — con una pagina de debug temporal
// (`/debug-clientes`, volcando `listClientes()` crudo, borrada despues de
// confirmar) se vio que la respuesta real HOY ya no tiene `domicilios[]`:
// tiene los campos de domicilio directo en el cliente (mismo nombre de
// campo que antes tenian adentro de cada elemento del array, sin `id`/
// `etiqueta`/`esPredeterminado` propios — un cliente, un domicilio). Esto
// rompia `clientes-view.tsx` y los `onSelectCliente` de Nueva Encomienda,
// que hacian `cliente.domicilios.find(...)` sobre un campo que ya no
// existe (`Cannot read properties of undefined (reading 'find')` en
// consola, crasheaba /clientes por completo). Se corrigieron los tres
// consumidores para leer los campos planos directo del cliente.
//
// Confirmado en vivo el 2026-09-10: en ese momento el backend etapa 1 SOLO
// tenia POST /clientes (crear) y GET /clientes (leer/buscar) — PATCH/PUT/
// DELETE devolvian el error de ruteo de Nest "Cannot <VERBO> /clientes/{id}".
// El backend agrego despues DELETE /clientes/{id} como soft-delete (marca el
// cliente como eliminado/inactivo del lado del servidor en vez de borrar la
// fila; GET /clientes ya no lo devuelve). No hay PATCH/PUT — sigue sin existir
// edicion, solo alta + listado + baja.
export interface ClienteApi {
  id: string;
  tipo: "persona" | "empresa";
  nombre: string;
  telefono: string;
  documento: string | null;
  email: string | null;
  esCuentaCorriente: boolean;
  // Agregado por el backend junto con el soft-delete (no estaba el
  // 2026-09-10 original). GET /clientes ya no devuelve los inactivos.
  activo: boolean;
  // Domicilio unico, plano (ver nota arriba — 2026-09-11).
  localidadId: string;
  sectorId: string;
  calle: string;
  numero: string | null;
  piso: string | null;
  referencia: string | null;
}

// GET /clientes?q= exige minimo 2 caracteres — evitamos pegarle al backend
// con busquedas mas cortas.
export async function searchClientes(q: string): Promise<ClienteApi[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const token = await requireToken();
  const params = new URLSearchParams({ q: query, limite: "8" });
  const pagina = await apiFetchColeccion<ClienteApi>(`/clientes?${params.toString()}`, { token });
  return pagina.datos;
}

// El `q` de GET /clientes solo matchea por el INICIO del nombre completo
// (confirmado en vivo, 2026-09-10: buscar "Duarte" no encuentra a "Ramona
// Duarte", que si aparece buscando "Ramona") - no sirve para buscar por
// apellido. Como no hay forma de pedirle eso al backend, esta funcion trae
// el listado completo (mismo endpoint que ya usa la pantalla de Clientes,
// tope de 200) y filtra en el cliente: matchea si ALGUNA palabra del nombre
// arranca con la busqueda, sin importar la posicion ("galarza" encuentra a
// "Juan Galarza", "ramona" sigue encontrando a "Ramona Duarte"). Prioriza
// los matches por la primera palabra (el comportamiento de antes) antes que
// los de apellido, para no cambiar el orden en el caso mas comun.
function normalizarNombre(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function searchClientesPorNombre(q: string): Promise<ClienteApi[]> {
  const query = normalizarNombre(q.trim());
  if (query.length < 2) return [];

  const clientes = await listClientes();
  const porPrimeraPalabra: ClienteApi[] = [];
  const porOtraPalabra: ClienteApi[] = [];

  for (const c of clientes) {
    const palabras = normalizarNombre(c.nombre).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) continue;
    if (palabras[0].startsWith(query)) {
      porPrimeraPalabra.push(c);
    } else if (palabras.some((p) => p.startsWith(query))) {
      porOtraPalabra.push(c);
    }
  }

  return [...porPrimeraPalabra, ...porOtraPalabra].slice(0, 8);
}

// GET /clientes sin `q` devuelve el listado completo (confirmado en vivo) —
// lo usa la pantalla de administracion de Clientes, a diferencia de
// searchClientes (con `q`, para el buscador rapido de Nueva Encomienda).
export async function listClientes(): Promise<ClienteApi[]> {
  const token = await requireToken();
  const pagina = await apiFetchColeccion<ClienteApi>("/clientes?limite=200", { token });
  return pagina.datos;
}

export async function createCliente(data: {
  tipo: "persona" | "empresa";
  nombre: string;
  telefono: string;
  documento?: string;
  email?: string;
  esCuentaCorriente?: boolean;
  localidadId: string;
  sectorId: string;
  calle: string;
  numero?: string;
  piso?: string;
  referencia?: string;
}): Promise<ClienteApi> {
  const token = await requireToken();
  return apiFetch<ClienteApi>("/clientes", { method: "POST", token, body: data });
}

// Baja (soft-delete): el backend marca el cliente como eliminado, no lo
// borra de la base. GET /clientes deja de devolverlo despues de esto.
export async function removeCliente(id: string): Promise<void> {
  const token = await requireToken();
  await apiFetch<void>(`/clientes/${id}`, { method: "DELETE", token });
}

// Edicion (PATCH): el backend agrego este endpoint despues del chequeo en
// vivo del 2026-09-10/11 documentado arriba (en ese momento PATCH/PUT
// devolvian el error de ruteo de Nest "Cannot PATCH /clientes/{id}").
// Mismo shape que createCliente (todos los campos de nuevo, no solo los
// que cambian) hasta confirmar en vivo si el backend acepta un PATCH
// parcial o exige el objeto completo.
export interface ActualizarClienteInput {
  tipo: "persona" | "empresa";
  nombre: string;
  telefono: string;
  documento?: string;
  email?: string;
  esCuentaCorriente?: boolean;
  localidadId: string;
  sectorId: string;
  calle: string;
  numero?: string;
  piso?: string;
  referencia?: string;
}

export async function actualizarCliente(
  id: string,
  data: ActualizarClienteInput
): Promise<ClienteApi> {
  const token = await requireToken();
  return apiFetch<ClienteApi>(`/clientes/${id}`, {
    method: "PATCH",
    token,
    body: data,
  });
}

// Atajo para Nueva Encomienda: cuando el remitente no vino de
// ClienteQuickPick (el usuario tipeo nombre/telefono a mano), tratamos de
// asociarlo a un Cliente real en vez de dejarlo como value object suelto —
// asi la base de clientes se completa sola con los remitentes que se repiten,
// sin que el usuario tenga que abrir la pantalla de Clientes aparte.
//
// Es "mejor esfuerzo": si algo falla, no tiramos error — el envio sigue su
// curso con el remitente como value object, igual que antes de que existiera
// este mecanismo. Requiere nombre Y telefono (el backend exige
// `telefono` no vacio, y sin telefono tampoco podemos buscar una
// coincidencia exacta con confianza).
//
// Para no duplicar: primero buscamos por nombre+telefono exacto entre los
// resultados de searchClientes (mismo endpoint que ClienteQuickPick).
//
// Domicilio placeholder: confirmado en vivo (2026-09-10) que POST /clientes
// exige domicilio ("domicilios must contain at least 1 elements" con la
// forma vieja de array — ver nota arriba, 2026-09-11, sobre el cambio a
// domicilio plano) — el formulario de origen de Nueva Encomienda no pide
// domicilio del remitente, y no queremos inventar una direccion real (le
// asignaria al cliente un domicilio falso). Como resolucion practica,
// creamos un domicilio placeholder explicito — localidad/sector por defecto
// (el primero que tenga sectores) y `calle` con un texto que deja claro que
// falta completarlo — en vez de no crear el cliente. Queda visible así en la
// pantalla de Clientes para quien lo quiera corregir mas adelante (todavia
// no hay edicion de cliente, asi que por ahora solo queda documentado).
export async function ensureClienteRemitente(
  nombre: string,
  telefono: string
): Promise<string | undefined> {
  const nombreTrim = nombre.trim();
  const telefonoTrim = telefono.trim();
  if (!nombreTrim || !telefonoTrim) return undefined;

  try {
    const candidatos = await searchClientes(nombreTrim);
    const exacto = candidatos.find(
      (c) =>
        c.nombre.trim().toLowerCase() === nombreTrim.toLowerCase() &&
        c.telefono.trim() === telefonoTrim
    );
    if (exacto) return exacto.id;

    const [localidades, sectores] = await Promise.all([listLocalidades(), listSectores()]);
    const localidadId =
      localidades.find((l) => sectores.some((s) => s.localidadId === l.id))?.id ??
      localidades[0]?.id;
    const sectorId = sectores.find((s) => s.localidadId === localidadId)?.id;
    if (!localidadId || !sectorId) return undefined;

    const nuevo = await createCliente({
      tipo: "persona",
      nombre: nombreTrim,
      telefono: telefonoTrim,
      localidadId,
      sectorId,
      calle: "Sin domicilio (completar) — cargado desde Nueva Encomienda",
    });
    return nuevo.id;
  } catch {
    return undefined;
  }
}
