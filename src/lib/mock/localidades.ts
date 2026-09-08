import type { Localidad } from "@/types";

// Subset of localities captured from the source system (Misiones province,
// plus the main Corrientes/Chaco destinations it dispatches to). Trimmed to a
// realistic, representative set for a frontend prototype.
const MISIONES: [string, boolean, boolean][] = [
  ["OBERA", true, true],
  ["POSADAS", true, true],
  ["ELDORADO", true, true],
  ["PUERTO RICO", true, true],
  ["SAN VICENTE", true, true],
  ["JARDIN AMERICA", true, true],
  ["ARISTOBULO DEL VALLE", true, false],
  ["APOSTOLES", true, true],
  ["ALEM", true, true],
  ["MONTECARLO", true, false],
  ["CAMPO GRANDE", true, false],
  ["GARUHAPE", true, false],
  ["IGUAZU", true, true],
  ["BERN IRIGOYEN", true, false],
  ["SAN IGNACIO", true, false],
  ["CANDELARIA", false, false],
  ["CAPIOVI", false, false],
  ["CORPUS", false, false],
  ["GARUPA", true, false],
  ["LEONI", false, false],
  ["RUIZ DE MONTOYA", true, false],
  ["SAN JOSE", false, false],
  ["2 ARROYOS", true, false],
  ["2 DE MAYO", true, true],
  ["9 DE JULIO", true, true],
  ["ANDRESITO", true, false],
  ["CERRO AZUL", true, false],
  ["EL SOBERBIO", true, false],
  ["SAN ANTONIO", false, false],
  ["WANDA", true, false],
  ["SAN JAVIER", false, false],
  ["SAN PEDRO", true, false],
  ["ALMAFUERTE", true, false],
  ["CONC DE LA SIERRA", false, false],
];

const CORRIENTES: [string, boolean, boolean][] = [
  ["CORRIENTES CAPITAL", true, true],
  ["SANTO TOME", true, false],
  ["VIRASORO", true, false],
  ["ITUZAINGO CORRIENTES", true, false],
  ["MERCEDES CORRIENTES", false, false],
  ["PASO DE LOS LIBRES CORRIENTES", false, false],
  ["GOYA", false, false],
  ["SAN CARLOS CORRIENTES", true, false],
  ["ALVEAR CORRIENTES", false, false],
  ["LA CRUZ", false, false],
];

const CHACO: [string, boolean, boolean][] = [
  ["RESISTENCIA", true, false],
  ["CHARATA", false, false],
  ["SAENZ PEÑA", false, false],
];

function slugId(nombre: string, provincia: string) {
  return `${provincia.slice(0, 3)}-${nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

function buildList(
  rows: [string, boolean, boolean][],
  provincia: Localidad["provincia"]
): Localidad[] {
  return rows.map(([nombre, corte, sabados]) => ({
    id: slugId(nombre, provincia),
    nombre,
    provincia,
    corte,
    despachaSabados: sabados,
  }));
}

export const LOCALIDADES: Localidad[] = [
  ...buildList(MISIONES, "MISIONES"),
  ...buildList(CORRIENTES, "CORRIENTES"),
  ...buildList(CHACO, "CHACO"),
];

export const LOCALIDADES_BY_PROVINCIA: Record<string, Localidad[]> = {
  MISIONES: LOCALIDADES.filter((l) => l.provincia === "MISIONES"),
  CORRIENTES: LOCALIDADES.filter((l) => l.provincia === "CORRIENTES"),
  CHACO: LOCALIDADES.filter((l) => l.provincia === "CHACO"),
};

export function localidadNombre(id: string): string {
  return LOCALIDADES.find((l) => l.id === id)?.nombre ?? "—";
}
