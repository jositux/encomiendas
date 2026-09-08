import type {
  ContactoEncomienda,
  Encomienda,
  EstadoEncomienda,
  FormaPago,
  TipoEncomienda,
} from "@/types";
import { mulberry32, intBetween, pick, daysAgoIso } from "./seed-random";
import { CLIENTES } from "./clientes";
import { LOCALIDADES } from "./localidades";
import { SUCURSALES } from "./sucursales";
import { PERSONAL } from "./personal";
import { GRUPOS_RUTA } from "./rutas";

const TIPOS: TipoEncomienda[] = ["PAQUETERIA", "PAQUETERIA", "PAQUETERIA", "CRR", "TRAMITE", "INTERNO"];
const ESTADOS: EstadoEncomienda[] = [
  "PENDIENTE",
  "EN_TRANSITO",
  "PARA_ENTREGAR",
  "ENTREGADA",
  "ENTREGADA",
  "ENTREGADA",
  "DEVUELTA",
];
const FORMAS_PAGO: FormaPago[] = ["PAGADO_ORIGEN", "PAGADO_DESTINO", "CTA_CORRIENTE"];

function contactoFrom(rng: () => number): ContactoEncomienda {
  const cliente = pick(rng, CLIENTES);
  const localidad = LOCALIDADES.find((l) => l.id === cliente.localidadId) ?? pick(rng, LOCALIDADES);
  return {
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    esCelular: cliente.esCelular,
    direccion: cliente.domicilio,
    localidadId: localidad.id,
    provincia: localidad.provincia,
  };
}

function letraDelDia(index: number) {
  return String.fromCharCode(65 + (index % 26));
}

function buildEncomiendas(count: number): Encomienda[] {
  const rng = mulberry32(9911);
  const out: Encomienda[] = [];

  for (let i = 0; i < count; i++) {
    const origen = contactoFrom(rng);
    let destino = contactoFrom(rng);
    let guard = 0;
    while (destino.localidadId === origen.localidadId && guard < 5) {
      destino = contactoFrom(rng);
      guard++;
    }
    const sucursal = pick(rng, SUCURSALES);
    const operador = pick(rng, PERSONAL);
    const designado = rng() > 0.15 ? pick(rng, PERSONAL) : undefined;
    const ruta = rng() > 0.2 ? pick(rng, GRUPOS_RUTA) : undefined;
    const tipo = pick(rng, TIPOS);
    const estado = pick(rng, ESTADOS);
    const fechaAlta = daysAgoIso(rng, 21);
    const terminada = estado === "ENTREGADA" || estado === "DEVUELTA";

    out.push({
      id: `enc-${i + 1}`,
      remito: `${100000 + i}`,
      letraDia: letraDelDia(i),
      fechaAlta,
      fechaBaja: terminada ? daysAgoIso(rng, 3) : undefined,
      fechaFinalizado: estado === "ENTREGADA" ? daysAgoIso(rng, 2) : undefined,
      origen,
      destino,
      tipo,
      esSobre: rng() > 0.75,
      observaciones: rng() > 0.7 ? "Frágil — avisar antes de entregar" : undefined,
      estado,
      designadoId: designado?.id,
      rutaId: ruta?.id,
      sucursalId: sucursal.id,
      operadorId: operador.id,
      responsableId: rng() > 0.6 ? pick(rng, PERSONAL).id : undefined,
      vehiculoId: undefined,
      bultos: intBetween(rng, 1, 4),
      flete: intBetween(rng, 1500, 12000),
      montoCrr: tipo === "CRR" ? intBetween(rng, 5000, 90000) : undefined,
      formaPago: pick(rng, FORMAS_PAGO),
      fleteCobrado: terminada ? rng() > 0.2 : rng() > 0.6,
      crrCobrado: tipo === "CRR" ? rng() > 0.4 : false,
      paqueteConmigo: rng() > 0.85,
    });
  }

  return out.sort((a, b) => (a.fechaAlta < b.fechaAlta ? 1 : -1));
}

export const ENCOMIENDAS: Encomienda[] = buildEncomiendas(140);

export const ESTADO_LABEL: Record<EstadoEncomienda, string> = {
  PENDIENTE: "Pendiente",
  EN_TRANSITO: "En tránsito",
  PARA_ENTREGAR: "Para entregar",
  ENTREGADA: "Entregada",
  DEVUELTA: "Devuelta",
  ELIMINADA: "Eliminada",
};

export const TIPO_LABEL: Record<TipoEncomienda, string> = {
  CRR: "Contra reembolso",
  PAQUETERIA: "Paquetería",
  TRAMITE: "Trámite",
  INTERNO: "Interno",
};
