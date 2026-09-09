import "server-only";

// ---------------------------------------------------------------------------
// Capa de datos del servidor.
//
// Esta app no tiene un backend real, pero en vez de guardar el estado en el
// navegador (localStorage) como antes, ahora vive en un archivo JSON en el
// propio proceso de Next.js y se lee/escribe únicamente desde Server
// Components y Server Actions (nunca se importa desde un componente
// cliente). Esto es lo más parecido a "una base de datos" que se puede tener
// sin agregar infraestructura externa, y deja el camino allanado para
// reemplazar estas funciones por llamadas a una API real el día de mañana.
// ---------------------------------------------------------------------------

import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type {
  Cliente,
  Encomienda,
  GrupoRuta,
  Localidad,
  Personal,
  Sucursal,
  Vehiculo,
  CierreCaja,
  MovimientoCrr,
} from "@/types";
import {
  CLIENTES,
  ENCOMIENDAS,
  GRUPOS_RUTA,
  LOCALIDADES,
  PERSONAL,
  SUCURSALES,
  VEHICULOS,
  CIERRES_CAJA,
  MOVIMIENTOS_CRR,
} from "@/lib/mock";

interface Db {
  encomiendas: Encomienda[];
  clientes: Cliente[];
  personal: Personal[];
  vehiculos: Vehiculo[];
  sucursales: Sucursal[];
  localidades: Localidad[];
  rutas: GrupoRuta[];
  cierresCaja: CierreCaja[];
  movimientosCrr: MovimientoCrr[];
}

function seedData(): Db {
  return {
    encomiendas: ENCOMIENDAS,
    clientes: CLIENTES,
    personal: PERSONAL,
    vehiculos: VEHICULOS,
    sucursales: SUCURSALES,
    localidades: LOCALIDADES,
    rutas: GRUPOS_RUTA,
    cierresCaja: CIERRES_CAJA,
    movimientosCrr: MOVIMIENTOS_CRR,
  };
}

// En desarrollo local esto vive dentro del proyecto (carpeta `.data/`,
// ignorada por git). En un deployment serverless (Vercel y similares) el
// filesystem del proyecto es de solo lectura salvo `/tmp` — en vez de
// confiar en una variable de entorno de la plataforma para detectarlo (poco
// confiable: depende de que el proyecto la tenga habilitada), probamos
// escribir ahí y si falla caemos a `/tmp`. Ojo: `/tmp` no es un disco
// persistente — cada instancia serverless (y cada cold start) puede partir
// de una copia distinta, así que en producción esto se comporta como una
// base de datos "de mentira" que puede resetearse sola. Sirve para la demo,
// no reemplaza un backend real.
const PRIMARY_DB_PATH = path.join(process.cwd(), ".data", "db.json");
const FALLBACK_DB_PATH = path.join(os.tmpdir(), "neo-encomiendas-data", "db.json");

let dbPathPromise: Promise<string> | null = null;

async function resolveDbPath(): Promise<string> {
  if (!dbPathPromise) {
    dbPathPromise = (async () => {
      try {
        await fs.mkdir(path.dirname(PRIMARY_DB_PATH), { recursive: true });
        await fs.access(path.dirname(PRIMARY_DB_PATH), fs.constants.W_OK);
        return PRIMARY_DB_PATH;
      } catch {
        return FALLBACK_DB_PATH;
      }
    })();
  }
  return dbPathPromise;
}

// Cache en memoria del proceso: evita releer el archivo en cada llamada
// dentro del mismo request/proceso. Se actualiza en cada escritura.
let memo: Db | null = null;

async function ensureFile(): Promise<Db> {
  const dbPath = await resolveDbPath();
  try {
    const raw = await fs.readFile(dbPath, "utf-8");
    return JSON.parse(raw) as Db;
  } catch {
    const seed = seedData();
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }
}

async function readDb(): Promise<Db> {
  if (memo) return memo;
  memo = await ensureFile();
  return memo;
}

async function writeDb(next: Db): Promise<void> {
  memo = next;
  const dbPath = await resolveDbPath();
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(next, null, 2), "utf-8");
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

// ---------------------------------------------------------------------------
// Getters — usados desde Server Components para renderizar cada página.
// ---------------------------------------------------------------------------

export async function getEncomiendas() {
  return (await readDb()).encomiendas;
}
export async function getClientes() {
  return (await readDb()).clientes;
}
export async function getPersonal() {
  return (await readDb()).personal;
}
export async function getVehiculos() {
  return (await readDb()).vehiculos;
}
export async function getSucursales() {
  return (await readDb()).sucursales;
}
export async function getLocalidades() {
  return (await readDb()).localidades;
}
export async function getRutas() {
  return (await readDb()).rutas;
}
export async function getCierresCaja() {
  return (await readDb()).cierresCaja;
}
export async function getMovimientosCrr() {
  return (await readDb()).movimientosCrr;
}

// ---------------------------------------------------------------------------
// Mutaciones — usadas únicamente desde src/server/actions.ts (Server Actions).
// ---------------------------------------------------------------------------

export async function createEncomienda(e: Omit<Encomienda, "id">) {
  const db = await readDb();
  const item: Encomienda = { ...e, id: nextId("enc") };
  await writeDb({ ...db, encomiendas: [item, ...db.encomiendas] });
  return item;
}
export async function updateEncomienda(id: string, patch: Partial<Encomienda>) {
  const db = await readDb();
  await writeDb({
    ...db,
    encomiendas: db.encomiendas.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  });
}
export async function removeEncomienda(id: string) {
  const db = await readDb();
  await writeDb({ ...db, encomiendas: db.encomiendas.filter((e) => e.id !== id) });
}

export async function createCliente(c: Omit<Cliente, "id" | "createdAt">) {
  const db = await readDb();
  const item: Cliente = { ...c, id: nextId("cli"), createdAt: new Date().toISOString() };
  await writeDb({ ...db, clientes: [item, ...db.clientes] });
  return item;
}
export async function updateCliente(id: string, patch: Partial<Cliente>) {
  const db = await readDb();
  await writeDb({
    ...db,
    clientes: db.clientes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  });
}
export async function removeCliente(id: string) {
  const db = await readDb();
  await writeDb({ ...db, clientes: db.clientes.filter((c) => c.id !== id) });
}

export async function createPersonal(p: Omit<Personal, "id">) {
  const db = await readDb();
  const item: Personal = { ...p, id: nextId("per") };
  await writeDb({ ...db, personal: [item, ...db.personal] });
  return item;
}
export async function updatePersonal(id: string, patch: Partial<Personal>) {
  const db = await readDb();
  await writeDb({
    ...db,
    personal: db.personal.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  });
}
export async function removePersonal(id: string) {
  const db = await readDb();
  await writeDb({ ...db, personal: db.personal.filter((p) => p.id !== id) });
}

export async function createVehiculo(v: Omit<Vehiculo, "id">) {
  const db = await readDb();
  const item: Vehiculo = { ...v, id: nextId("veh") };
  await writeDb({ ...db, vehiculos: [item, ...db.vehiculos] });
  return item;
}
export async function updateVehiculo(id: string, patch: Partial<Vehiculo>) {
  const db = await readDb();
  await writeDb({
    ...db,
    vehiculos: db.vehiculos.map((v) => (v.id === id ? { ...v, ...patch } : v)),
  });
}
export async function removeVehiculo(id: string) {
  const db = await readDb();
  await writeDb({ ...db, vehiculos: db.vehiculos.filter((v) => v.id !== id) });
}

export async function updateSucursal(id: string, patch: Partial<Sucursal>) {
  const db = await readDb();
  await writeDb({
    ...db,
    sucursales: db.sucursales.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  });
}
export async function createSucursal(s: Omit<Sucursal, "id">) {
  const db = await readDb();
  const item: Sucursal = { ...s, id: nextId("suc") };
  await writeDb({ ...db, sucursales: [...db.sucursales, item] });
  return item;
}

export async function updateLocalidad(id: string, patch: Partial<Localidad>) {
  const db = await readDb();
  await writeDb({
    ...db,
    localidades: db.localidades.map((l) => (l.id === id ? { ...l, ...patch } : l)),
  });
}
export async function createLocalidad(l: Omit<Localidad, "id">) {
  const db = await readDb();
  const item: Localidad = { ...l, id: nextId("loc") };
  await writeDb({ ...db, localidades: [...db.localidades, item] });
  return item;
}

export async function createRuta(r: Omit<GrupoRuta, "id">) {
  const db = await readDb();
  const item: GrupoRuta = { ...r, id: nextId("ruta") };
  await writeDb({ ...db, rutas: [...db.rutas, item] });
  return item;
}
export async function updateRuta(id: string, patch: Partial<GrupoRuta>) {
  const db = await readDb();
  await writeDb({ ...db, rutas: db.rutas.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}
export async function removeRuta(id: string) {
  const db = await readDb();
  await writeDb({ ...db, rutas: db.rutas.filter((r) => r.id !== id) });
}

export async function createCierreCaja(c: Omit<CierreCaja, "id">) {
  const db = await readDb();
  const item: CierreCaja = { ...c, id: nextId("cierre") };
  await writeDb({ ...db, cierresCaja: [item, ...db.cierresCaja] });
  return item;
}
export async function updateCierreCaja(id: string, patch: Partial<CierreCaja>) {
  const db = await readDb();
  await writeDb({
    ...db,
    cierresCaja: db.cierresCaja.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  });
}

export async function updateMovimientoCrr(id: string, patch: Partial<MovimientoCrr>) {
  const db = await readDb();
  await writeDb({
    ...db,
    movimientosCrr: db.movimientosCrr.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  });
}

export async function resetDemoData() {
  await writeDb(seedData());
}
