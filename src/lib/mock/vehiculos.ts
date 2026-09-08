import type { Vehiculo } from "@/types";
import { mulberry32, intBetween, pick } from "./seed-random";
import { PERSONAL } from "./personal";

const MARCAS_MOTO: [string, string][] = [
  ["Honda", "Wave 110"],
  ["Honda", "CG 150"],
  ["Yamaha", "YBR 125"],
  ["Motomel", "B110"],
  ["Corven", "Energy 110"],
];

const MARCAS_CAMIONETA: [string, string][] = [
  ["Toyota", "Hilux"],
  ["Volkswagen", "Saveiro"],
  ["Fiat", "Strada"],
  ["Renault", "Kangoo"],
  ["Chevrolet", "Montana"],
];

const MARCAS_CAMION: [string, string][] = [
  ["Mercedes-Benz", "Accelo 815"],
  ["Iveco", "Daily 70C"],
  ["Ford", "Cargo 1119"],
];

function buildVehiculos(): Vehiculo[] {
  const rng = mulberry32(77123);
  const out: Vehiculo[] = [];
  let n = 1;

  const make = (tipo: Vehiculo["tipo"], catalog: [string, string][], count: number) => {
    for (let i = 0; i < count; i++) {
      const [marca, modelo] = pick(rng, catalog);
      const chofer = rng() > 0.25 ? pick(rng, PERSONAL) : undefined;
      out.push({
        id: `veh-${n}`,
        patente: tipo === "MOTO"
          ? `A${intBetween(rng, 100, 999)}${String.fromCharCode(65 + intBetween(rng, 0, 25))}${String.fromCharCode(65 + intBetween(rng, 0, 25))}`
          : `AB${intBetween(rng, 100, 999)}${String.fromCharCode(65 + intBetween(rng, 0, 25))}`,
        marca,
        modelo,
        anio: intBetween(rng, 2014, 2024),
        tipo,
        estado: rng() > 0.85 ? "TALLER" : rng() > 0.1 ? "ACTIVO" : "INACTIVO",
        choferId: chofer?.id,
      });
      n++;
    }
  };

  make("MOTO", MARCAS_MOTO, 14);
  make("CAMIONETA", MARCAS_CAMIONETA, 10);
  make("CAMION", MARCAS_CAMION, 5);

  return out;
}

export const VEHICULOS: Vehiculo[] = buildVehiculos();
