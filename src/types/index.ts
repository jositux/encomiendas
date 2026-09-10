// ---------------------------------------------------------------------------
// Neo Encomiendas — Domain model
//
// This file is the single source of truth for the shapes of data that move
// through the app. Keeping every entity here (instead of scattering `type`
// declarations across pages) makes it trivial to see what the eventual
// backend/API contract needs to look like when this frontend is wired up to
// real services.
// ---------------------------------------------------------------------------

export type Provincia = "MISIONES" | "CORRIENTES" | "CHACO";

export type TipoEncomienda = "CRR" | "PAQUETERIA" | "TRAMITE" | "INTERNO";

export type EstadoEncomienda =
  | "PENDIENTE" // cargada, todavia no fue levantada
  | "EN_TRANSITO" // levantada / procesada, viajando entre sucursales
  | "PARA_ENTREGAR" // llego a destino, lista para el reparto final
  | "ENTREGADA"
  | "DEVUELTA"
  | "ELIMINADA";

export type FormaPago = "PAGADO_ORIGEN" | "PAGADO_DESTINO" | "CTA_CORRIENTE";

export interface ContactoEncomienda {
  nombre: string;
  telefono: string;
  esCelular: boolean;
  direccion: string;
  localidadId: string;
  provincia: Provincia;
  coordenadas?: string;
}

export interface Encomienda {
  id: string;
  remito: string;
  letraDia: string;
  fechaAlta: string; // ISO
  fechaBaja?: string; // ISO — cuando se dio de baja/entrego
  fechaFinalizado?: string;
  origen: ContactoEncomienda;
  destino: ContactoEncomienda;
  tipo: TipoEncomienda;
  esSobre: boolean;
  observaciones?: string;
  estado: EstadoEncomienda;
  designadoId?: string; // Personal a cargo (ruta/chofer)
  rutaId?: string;
  sucursalId: string; // sucursal que la procesa
  operadorId: string; // quien la cargo
  responsableId?: string;
  vehiculoId?: string;
  bultos: number;
  flete: number;
  montoCrr?: number;
  formaPago: FormaPago;
  fleteCobrado: boolean;
  crrCobrado: boolean;
  paqueteConmigo: boolean;
}

export interface Cliente {
  id: string;
  dniCuit: string;
  nombre: string;
  telefono: string;
  esCelular: boolean;
  domicilio: string;
  localidadId: string;
  provincia: Provincia;
  fechaNacimiento?: string;
  ctaCte: boolean;
  codCtaCte?: string;
  createdAt: string;
}

export type TipoPersonal =
  | "DESIGNADO"
  | "CONTROL_1"
  | "CONTROL_2"
  | "ENCARGADO"
  | "OPERADOR"
  | "TELEFONISTA"
  | "ADMINISTRADOR"
  | "ADMINISTRATIVO";

export type EstadoCaja = "CERRADA" | "INICIADA" | "HABILITADA";

export interface PermisosPersonal {
  levantes: boolean;
  levantesModificar: boolean;
  encomiendas: boolean;
  designar: boolean;
  despachar: boolean;
  modificar: boolean;
  eliminar: boolean;
  cajas: boolean;
  procesar: boolean;
  control1: boolean;
  control2: boolean;
  control3: boolean;
  crr: boolean;
  administrador: boolean;
}

export interface Personal {
  id: string;
  dni: string;
  apellidoNombre: string;
  alias: string;
  cajaHabilitada: EstadoCaja;
  sucursalId: string;
  grupoRutaId?: string;
  tipoPersonal: TipoPersonal;
  permisos: PermisosPersonal;
  activo: boolean;
  telefono?: string;
}

export type EstadoVehiculo = "ACTIVO" | "INACTIVO" | "TALLER";
export type TipoVehiculo = "MOTO" | "CAMIONETA" | "CAMION";

export interface Vehiculo {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  tipo: TipoVehiculo;
  estado: EstadoVehiculo;
  choferId?: string;
}

// Refleja GET /vehiculos del backend real. Sin marca/modelo/año/estado (el
// backend etapa 1 no modela ficha de vehículo) ni choferId (el chofer se
// asigna al despacho/recorrido, no al vehículo — eliminado a propósito, ver
// src/server/services/vehiculos.ts).
export interface VehiculoBackend {
  id: string;
  nombre: string;
  tipo: string;
  patente: string | null;
  activo: boolean;
}

// `Sucursal` sigue siendo la forma legacy/mock (la usa el header para el
// puntito de color junto al nombre de sucursal del usuario). La pantalla de
// administración `/sucursales` ya no usa este tipo — ver `PuntoBackend`.
export interface Sucursal {
  id: string;
  nombre: string;
  codigo: string;
  participaCorte: boolean;
  procesarHastaHora: number; // 0 = sin limite
  color: string; // hex
  provincia: Provincia;
  direccion?: string;
}

// Refleja GET /puntos del backend real (+ nombre de localidad ya resuelto).
// No tiene `color`/`codigo`/`procesarHastaHora`/`participaCorte`: no existen
// en el backend. `procesarHastaHora` en particular lo reemplaza
// `recorrido.hora_corte` (ver src/server/services/puntos.ts).
export interface PuntoBackend {
  id: string;
  nombre: string;
  localidadId: string;
  localidadNombre: string;
  tipo: "base" | "deposito";
  esCasaCentral: boolean;
  esDepositoCentral: boolean;
  activo: boolean;
}

export interface GrupoRuta {
  id: string;
  nombre: string;
  sucursalProcesaId: string;
  localidadIds: string[];
  choferId?: string;
  activo: boolean;
}

// Refleja GET /recorridos del backend real (+ nombres ya resueltos y las
// localidades cubiertas, derivadas de qué sectores apuntan a este recorrido
// — ver src/server/services/recorridos.ts).
export interface RecorridoBackend {
  id: string;
  nombre: string;
  baseId: string;
  baseNombre: string;
  choferPredeterminadoId: string | null;
  choferNombre: string | null;
  vehiculoPredeterminadoId: string | null;
  vehiculoNombre: string | null;
  horaCorte: string | null;
  activo: boolean;
  localidadIds: string[];
}

// `Localidad` sigue siendo la forma "legacy"/mock que usa el resto de la app
// (Nueva Encomienda, Clientes, etc. — sin tocar). La pantalla de
// administración de Localidades (`/localidades`) ya no usa este tipo: pega
// contra el backend real, que tiene una forma distinta (ver
// `LocalidadBackend` más abajo y src/server/services/localidades.ts).
export interface Localidad {
  id: string;
  nombre: string;
  provincia: Provincia;
  corte: boolean;
  despachaSabados: boolean;
}

// Refleja GET /localidades del backend real (más el nombre de provincia ya
// resuelto server-side, para no pegarle a /provincias también desde la UI).
// El backend no tiene `corte` ni `despachaSabados` en localidad — según
// obsidian_vault/wiki/entities/modelo-geografico.md del backend, "corte" es
// una propiedad de un PAR de localidades (`servicio_par.tiene_corte`), y
// "despacha sábados" es una regla fija de toda la empresa, no algo que se
// configure localidad por localidad.
export interface LocalidadBackend {
  id: string;
  nombre: string;
  provinciaId: string;
  provinciaNombre: string;
}

// -- Cajas / rendicion diaria -------------------------------------------------

export interface ItemGasto {
  id: string;
  concepto: string;
  detalle?: string;
  importe: number;
}

export interface CierreCaja {
  id: string;
  personalId: string;
  fecha: string; // ISO date
  entregasCobradas: { remito: number; flete: number; crr: number };
  levantes: { remito: number; flete: number };
  soloEntrega: number;
  gastosBase: ItemGasto[];
  gastoCliente: ItemGasto[];
  otrasCobranzas: ItemGasto[];
  denominaciones: { cantidad: number; nominacion: number }[];
  efectivoRendido: number;
  estado: "ABIERTA" | "CERRADA" | "CONCILIADA";
}

export interface ResumenCierre {
  fletesDestino: number;
  fletesOrigen: number;
  totalCrr: number;
  otrasCobranzas: number;
  gastoCliente: number;
  gastosBase: number;
  totalARendir: number;
  efectivoRendido: number;
  diferencia: number;
}

// -- CRR (contra-reembolso) ---------------------------------------------------

export interface MovimientoCrr {
  id: string;
  encomiendaId: string;
  remito: string;
  cliente: string;
  monto: number;
  estado: "PENDIENTE" | "COBRADO" | "RENDIDO";
  fecha: string;
}

// -- Auth ---------------------------------------------------------------------

// Refleja 1:1 lo que devuelve GET /auth/yo del backend real (ver
// src/identidad/auth/auth.controller.ts, interfaz ContextoPropio). No se
// inventan campos que el backend no tiene: no hay un "tipoPersonal"/rol legible
// acá, solo permisos planos y el alcance (punto propio + puntos habilitados).
export interface SesionUsuario {
  usuarioId: string;
  nombre: string;
  puntoId: string;
  esGlobal: boolean;
  puntosEnAlcance: string[];
  permisos: string[];
}
