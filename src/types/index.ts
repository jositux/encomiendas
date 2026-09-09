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

export interface GrupoRuta {
  id: string;
  nombre: string;
  sucursalProcesaId: string;
  localidadIds: string[];
  choferId?: string;
  activo: boolean;
}

export interface Localidad {
  id: string;
  nombre: string;
  provincia: Provincia;
  corte: boolean;
  despachaSabados: boolean;
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
