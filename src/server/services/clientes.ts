import "server-only";

import { apiFetch } from "../api-client";
import { requireToken } from "./shared";

// El backend real modela cliente + domicilio(s) como entidades propias
// (POST /clientes exige tipo/nombre/telefono/domicilios[]), muy distinto del
// mock (Cliente con un solo domicilio como string). Para Nueva Encomienda no
// hace falta tener un Cliente real: remitente/destinatario del envio son
// value objects sueltos (ver envios.ts) — el cliente es solo un atajo
// opcional para autocompletar datos repetidos.
export interface DomicilioApi {
  id: string;
  localidadId: string;
  sectorId: string;
  calle: string;
  numero: string | null;
  piso: string | null;
  referencia: string | null;
  etiqueta: string | null;
  esPredeterminado: boolean;
}

export interface ClienteApi {
  id: string;
  tipo: "persona" | "empresa";
  nombre: string;
  telefono: string;
  documento: string | null;
  email: string | null;
  esCuentaCorriente: boolean;
  domicilios: DomicilioApi[];
}

// GET /clientes?q= exige minimo 2 caracteres — evitamos pegarle al backend
// con busquedas mas cortas.
export async function searchClientes(q: string): Promise<ClienteApi[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const token = await requireToken();
  const params = new URLSearchParams({ q: query, limite: "8" });
  return apiFetch<ClienteApi[]>(`/clientes?${params.toString()}`, { token });
}

export interface DomicilioInput {
  localidadId: string;
  sectorId: string;
  calle: string;
  numero?: string;
  piso?: string;
  referencia?: string;
}

export async function createCliente(data: {
  tipo: "persona" | "empresa";
  nombre: string;
  telefono: string;
  documento?: string;
  domicilios: DomicilioInput[];
}): Promise<ClienteApi> {
  const token = await requireToken();
  return apiFetch<ClienteApi>("/clientes", { method: "POST", token, body: data });
}
