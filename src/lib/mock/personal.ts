import type { Personal, PermisosPersonal, TipoPersonal } from "@/types";
import { SUCURSALES } from "./sucursales";
import { GRUPOS_RUTA } from "./rutas";
import { mulberry32, pick, intBetween } from "./seed-random";

const NOMBRES: [string, string][] = [
  ["GONZALEZ MATIAS", "ADRIAN"],
  ["BOGADO ROSA", "ADRIANA"],
  ["GIMENEZ FABIAN", "AGUSTIN"],
  ["PEREYRA GERARDO", "AGUSTIN P."],
  ["ROJA CORVO LUCAS", "ALBERTO"],
  ["ARANDA ALDANA", "ALDANA"],
  ["BERNERI ALEJANDRO", "ALEJANDRO"],
  ["RODRIGUEZ DANIEL", "ALMEIDA"],
  ["ALVEZ JUAN", "ALVEZ"],
  ["AMARILLA JUAN", "AMARILLA"],
  ["AGUIRRE ANA", "ANA"],
  ["CONTRERAS ANABELA", "ANABELA"],
  ["GONZALEZ ANGEL", "ANGEL"],
  ["ALVEZ LEONARDO", "ANIBAL"],
  ["FERNANDEZ ARACELI", "ARACELI"],
  ["BENITEZ CARLOS", "BENITEZ"],
  ["SILVA BENJAMIN", "BENJAMIN"],
  ["CARDOZO ESTELA", "BETIANA"],
  ["MOREL ALBERTO", "BETO"],
  ["FLEITAS BRIAN", "BRIAN"],
  ["CARDOZO MARIO", "CARDOZO"],
  ["OJEDA CESAR", "CESAR"],
  ["ROMERO CLAUDIA", "CLAUDIA"],
  ["MEDINA CLAUDIO", "CLAUDIO"],
  ["CRISTALDO JOSE", "CRISTALDO"],
  ["FERREYRA CRISTIAN", "CRISTIAN"],
  ["DALMA ROMINA", "DALMA"],
  ["ACOSTA DANIEL", "DANIEL"],
  ["LOPEZ DAVID", "DAVID"],
  ["FRANCO EDSON", "EDSON"],
  ["ESTARNECHUK EDUARDO", "EDUARDO"],
  ["MARTINEZ ELIANA", "ELIANA"],
  ["SOSA ERIK", "ERIK"],
  ["GAUNA ERNESTO", "ERNESTO"],
  ["ESTECHE MARCELO", "ESTECHE"],
  ["ROLON FABRICIO", "FABRICIO"],
  ["QUIROZ FRANCO", "FRANCO"],
  ["FRETES RAMON", "FRETES"],
  ["MARTINEZ GABRIEL", "GABRIEL"],
  ["GALARZA JUAN", "GALARZA"],
  ["GOMEZ RUBEN", "GOMEZ"],
  ["FERNANDEZ GONZALO", "GONZALO"],
  ["ACUÑA GRISELDA", "GRISELDA"],
  ["PEREZ GUSTAVO", "GUSTAVO"],
  ["NUÑEZ HECTOR", "HECTOR"],
  ["DUARTE HERNAN", "HERNAN"],
  ["SANTACRUZ HORACIO", "HORACIO"],
  ["VERA ITATI", "ITATI"],
  ["MEZA JACQUELINE", "JACQUELINE"],
  ["JARA MIGUEL", "JARA"],
  ["FERREIRA JAVIER", "JAVIER"],
  ["RAMIREZ JESUS", "JESUS"],
  ["ALVEZ JONATHAN", "JONATHAN"],
  ["MOLINA JORGE", "JORGE"],
  ["CABRERA JOSE", "JOSE"],
  ["BENITEZ JULIO", "JULIO"],
  ["ROMERO LAUTARO", "LAUTARO"],
  ["CRISTALDO LEANDRO", "LEANDRO"],
  ["SOSA LEONARDO", "LEONARDO"],
  ["OJEDA LEONEL", "LEONEL"],
  ["LEZCANO ADRIAN", "LEZCANO"],
  ["ROJAS LUCAS", "LUCAS"],
  ["FERNANDEZ LUIS", "LUIS"],
  ["ALVEZ MACARENA", "MACARENA"],
  ["MAIDANA RAMON", "MAIDANA"],
  ["ACOSTA MARCOS", "MARCOS"],
  ["FERREYRA MARIA", "MARIA"],
  ["GAUTO MARLENE", "MARLENE"],
  ["ORTIZ MARTIN", "MARTIN"],
  ["SILVA MATIAS", "MATIAS"],
  ["BAEZ MAURO", "MAURO"],
  ["ROMERO MAXIMO", "MAXIMO"],
  ["ALVEZ MICAELA", "MICAELA"],
  ["BENITEZ MILAGROS", "MILAGROS"],
  ["MOREL JUAN", "MOREL"],
  ["MUÑOZ ANDRES", "MUÑOZ"],
  ["ROLON NAHUEL", "NAHUEL"],
  ["BOGADO NICOLAS", "NICOLAS"],
  ["OBREGON WALTER", "OBREGON"],
  ["FLEITAS OMAR", "OMAR"],
  ["MARTINEZ OSVALDO", "OSVALDO"],
  ["DA LUZ PAOLA", "PAOLA"],
  ["FERREIRA PORTILLO", "PORTILLO"],
  ["GIMENEZ RAUL", "RAUL"],
  ["ALVEZ RICARDO", "RICARDO"],
  ["MEDINA ROCIO", "ROCIO"],
  ["SANTACRUZ RODRIGO", "RODRIGO"],
  ["CARDOZO ROJAS", "ROJAS"],
  ["FERREYRA ROLLY", "ROLLY"],
  ["GAUNA ROMAN", "ROMAN"],
  ["BENITEZ SANDRA", "SANDRA"],
  ["MOLINA SANTIAGO", "SANTIAGO"],
  ["SCHULZ RICARDO", "SCHULZ"],
  ["SILVA SEBASTIAN", "SEBASTIAN"],
  ["GAUTO ULISES", "ULISES"],
  ["ROMERO VALERIA", "VALERIA"],
  ["CARDOZO VICTOR", "VICTOR"],
  ["ACOSTA WILLIAMS", "WILLIAMS"],
];

const TIPOS: TipoPersonal[] = [
  "OPERADOR",
  "DESIGNADO",
  "ENCARGADO",
  "TELEFONISTA",
  "ADMINISTRATIVO",
  "CONTROL_1",
  "CONTROL_2",
  "ADMINISTRADOR",
];

function permisosFor(tipo: TipoPersonal): PermisosPersonal {
  const base: PermisosPersonal = {
    levantes: false,
    levantesModificar: false,
    encomiendas: false,
    designar: false,
    despachar: false,
    modificar: false,
    eliminar: false,
    cajas: false,
    procesar: false,
    control1: false,
    control2: false,
    control3: false,
    crr: false,
    administrador: false,
  };
  switch (tipo) {
    case "ADMINISTRADOR":
      return Object.fromEntries(
        Object.keys(base).map((k) => [k, true])
      ) as unknown as PermisosPersonal;
    case "ENCARGADO":
      return { ...base, levantes: true, encomiendas: true, designar: true, despachar: true, modificar: true, cajas: true, procesar: true, crr: true };
    case "OPERADOR":
      return { ...base, levantes: true, encomiendas: true, despachar: true, procesar: true };
    case "TELEFONISTA":
      return { ...base, encomiendas: true };
    case "CONTROL_1":
      return { ...base, control1: true, encomiendas: true };
    case "CONTROL_2":
      return { ...base, control2: true, encomiendas: true, control1: true };
    case "ADMINISTRATIVO":
      return { ...base, encomiendas: true, cajas: true, crr: true };
    default:
      return { ...base, levantes: true };
  }
}

function buildPersonal(): Personal[] {
  const rng = mulberry32(20260907);
  return NOMBRES.map(([apellidoNombre, alias], i) => {
    const tipo = pick(rng, TIPOS);
    const sucursal = pick(rng, SUCURSALES);
    const grupo = rng() > 0.35 ? pick(rng, GRUPOS_RUTA) : undefined;
    return {
      id: `per-${i + 1}`,
      dni: String(intBetween(rng, 18000000, 46000000)),
      apellidoNombre,
      alias,
      cajaHabilitada: pick(rng, ["CERRADA", "INICIADA", "HABILITADA"] as const),
      sucursalId: sucursal.id,
      grupoRutaId: grupo?.id,
      tipoPersonal: tipo,
      permisos: permisosFor(tipo),
      activo: rng() > 0.06,
      telefono: `37${intBetween(rng, 40000000, 59999999)}`,
    };
  });
}

export const PERSONAL: Personal[] = buildPersonal();

export function personalNombre(id?: string): string {
  if (!id) return "Sin designar";
  return PERSONAL.find((p) => p.id === id)?.apellidoNombre ?? "Sin designar";
}

export const TIPO_PERSONAL_LABEL: Record<TipoPersonal, string> = {
  DESIGNADO: "Designado",
  CONTROL_1: "Control 1",
  CONTROL_2: "Control 2",
  ENCARGADO: "Encargado",
  OPERADOR: "Operador",
  TELEFONISTA: "Telefonista",
  ADMINISTRADOR: "Administrador",
  ADMINISTRATIVO: "Administrativo",
};
