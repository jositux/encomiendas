// Datos de prueba compartidos por los tests de Seguimiento (vista, panel
// "Modificar datos" y sus helpers). No se importa desde código de la app.

import type { EnvioApi } from "@/server/services/envios";
import type {
  EventoSeguimiento,
  SeguimientoResponse,
} from "@/server/services/seguimiento";

export function envioFixture(overrides: Partial<EnvioApi> = {}): EnvioApi {
  return {
    id: "envio-1",
    numero: "000000032-1",
    remitoManualNumero: "000123",
    remitenteNombre: "Ferreteria San Martin",
    remitenteTelefono: "3755-420004",
    remitenteCalle: "Sarmiento",
    remitenteNumero: "850",
    remitentePiso: null,
    remitenteReferencia: null,
    clienteRemitenteId: null,
    destinatarioNombre: "Farmacia Centro SRL",
    destinatarioTelefono: "3764-420014",
    destinatarioCalle: "Av. Mitre",
    destinatarioNumero: "2180",
    destinatarioPiso: null,
    destinatarioReferencia: "casa verde frente a la plaza",
    clienteDestinatarioId: null,
    localidadOrigenId: "loc-obera",
    localidadDestinoId: "loc-posadas",
    sectorDestinoId: "sec-centro",
    recorridoId: null,
    puntoAltaId: "punto-obera",
    cantidadBultos: 2,
    fleteImporte: "10000.00",
    tipo: "paqueteria",
    lugarPago: "origen",
    formaPago: "contado",
    contrarreembolsoImporte: null,
    valorDeclarado: "50000.00",
    gasto: "0.00",
    observaciones: "Repuestos",
    camino: "",
    guiaDiariaNumero: 17,
    estadoActual: "REGISTRADO",
    custodiaActualUsuarioId: null,
    custodiaActualPuntoId: "punto-obera",
    planillaActualId: null,
    creadoEn: "2026-10-01T12:00:00.000Z",
    guiaDiaria: "A17",
    ubicacion: "en_origen",
    ...overrides,
  };
}

export function eventoFixture(overrides: Partial<EventoSeguimiento> = {}): EventoSeguimiento {
  return {
    id: "evento-alta",
    tipo: "alta",
    frase: "Ana registró el envío",
    occurredAt: "2026-10-01T12:00:00.000Z",
    recordedAt: "2026-10-01T12:00:00.000Z",
    relojSospechoso: false,
    responsable: { id: "u-ana", nombre: "Ana" },
    registradoPor: null,
    punto: null,
    planilla: null,
    detalle: {},
    ...overrides,
  };
}

export function seguimientoFixture(
  overrides: Omit<Partial<SeguimientoResponse>, "envio"> & { envio?: Partial<EnvioApi> } = {}
): SeguimientoResponse {
  const { envio, ...resto } = overrides;
  return {
    envio: { ...envioFixture(envio), etiquetas: ["000000032-1/1", "000000032-1/2"] },
    custodiaActual: { usuario: null, punto: { id: "punto-obera", nombre: "Oberá" } },
    eventos: [eventoFixture()],
    ...resto,
  };
}
