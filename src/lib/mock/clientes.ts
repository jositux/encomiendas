import type { Cliente } from "@/types";
import { mulberry32, intBetween, pick } from "./seed-random";
import { LOCALIDADES } from "./localidades";

const APELLIDOS = [
  "FELTAN", "RAMIREZ", "PIMIENTA", "SCHERER", "DORNELLES", "GONZALEZ", "BENITEZ",
  "ACOSTA", "FERREYRA", "ROMERO", "MEDINA", "SOSA", "ALVEZ", "CARDOZO", "GAUNA",
  "DUARTE", "VERA", "MOLINA", "RAMOS", "SANCHEZ", "TORRES", "NUÑEZ", "FLORES",
  "OJEDA", "SILVA", "CABRERA", "ORTIZ", "GIMENEZ", "PEREYRA", "MARTINEZ",
];
const NOMBRES = [
  "DANIEL", "AUGUSTO", "NEGRA", "DAHIANA", "LILIANA", "MATIAS", "CARLA", "JORGE",
  "ANALIA", "RAMON", "SOFIA", "PABLO", "LUCIA", "FEDERICO", "CAMILA", "IGNACIO",
  "VALENTINA", "NICOLAS", "AGUSTINA", "TOMAS", "MICAELA", "SANTIAGO", "ROCIO",
];

const CALLES = [
  "AV SAN MARTIN", "JUAN DIAZ SOLIS", "BERMUDEZ", "BARRIO LAS MIGUELAS",
  "PARAJE CANAL TORTO", "AV ROQUE SAENZ PEÑA", "SARMIENTO", "BELGRANO",
  "AV LIBERTADOR", "MITRE", "AV CORRIENTES", "AV URQUIZA", "AV COSTANERA",
  "RUTA 12 KM", "COLON", "RIVADAVIA", "9 DE JULIO", "AV FRANCISCO DE HARO",
];

function buildClientes(count: number): Cliente[] {
  const rng = mulberry32(444555);
  const out: Cliente[] = [];
  for (let i = 0; i < count; i++) {
    const localidad = pick(rng, LOCALIDADES);
    const nombre = `${pick(rng, APELLIDOS)} ${pick(rng, NOMBRES)}`;
    const ctaCte = rng() > 0.8;
    out.push({
      id: `cli-${i + 1}`,
      dniCuit: rng() > 0.5 ? String(intBetween(rng, 18000000, 46000000)) : `20-${intBetween(rng, 18000000, 46000000)}-${intBetween(rng, 0, 9)}`,
      nombre,
      telefono: `37${intBetween(rng, 40000000, 59999999)}`,
      esCelular: rng() > 0.15,
      domicilio: `${pick(rng, CALLES)} ${intBetween(rng, 10, 3200)}`,
      localidadId: localidad.id,
      provincia: localidad.provincia,
      fechaNacimiento: rng() > 0.4 ? `${intBetween(rng, 1955, 2003)}-${String(intBetween(rng, 1, 12)).padStart(2, "0")}-${String(intBetween(rng, 1, 28)).padStart(2, "0")}` : undefined,
      ctaCte,
      codCtaCte: ctaCte ? `CC-${1000 + i}` : undefined,
      createdAt: new Date(2024, intBetween(rng, 0, 11), intBetween(rng, 1, 28)).toISOString(),
    });
  }
  return out;
}

export const CLIENTES: Cliente[] = buildClientes(48);
