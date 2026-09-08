import type { Sucursal } from "@/types";

export const SUCURSALES: Sucursal[] = [
  { id: "suc-andresito", nombre: "Andresito", codigo: "11223377", participaCorte: false, procesarHastaHora: 0, color: "#c9a0dc", provincia: "MISIONES" },
  { id: "suc-apostoles", nombre: "Apóstoles", codigo: "11223388", participaCorte: false, procesarHastaHora: 0, color: "#d6a3d6", provincia: "MISIONES" },
  { id: "suc-corrientes", nombre: "Corrientes Capital", codigo: "11223344", participaCorte: false, procesarHastaHora: 0, color: "#e3a8d1", provincia: "CORRIENTES" },
  { id: "suc-deposito28", nombre: "Depósito 28", codigo: "99887799", participaCorte: false, procesarHastaHora: 0, color: "#8a6d5c", provincia: "MISIONES" },
  { id: "suc-deposito-posadas", nombre: "Depósito Posadas", codigo: "99887777", participaCorte: true, procesarHastaHora: 15, color: "#111827", provincia: "MISIONES" },
  { id: "suc-eldorado", nombre: "Eldorado", codigo: "99887766", participaCorte: false, procesarHastaHora: 0, color: "#e0c341", provincia: "MISIONES" },
  { id: "suc-garuhape", nombre: "Garuhapé", codigo: "11223355", participaCorte: false, procesarHastaHora: 0, color: "#d6a3d6", provincia: "MISIONES" },
  { id: "suc-iguazu", nombre: "Iguazú", codigo: "99887744", participaCorte: false, procesarHastaHora: 0, color: "#a9c2f0", provincia: "MISIONES" },
  { id: "suc-irigoyen", nombre: "Bernardo de Irigoyen", codigo: "99887755", participaCorte: false, procesarHastaHora: 0, color: "#8fd19e", provincia: "MISIONES" },
  { id: "suc-jardin", nombre: "Jardín América", codigo: "11223366", participaCorte: true, procesarHastaHora: 13, color: "#e6b3d0", provincia: "MISIONES" },
  { id: "suc-obera", nombre: "Oberá", codigo: "99887733", participaCorte: true, procesarHastaHora: 15, color: "#1d4ed8", provincia: "MISIONES" },
  { id: "suc-obera-adm", nombre: "Oberá Administración", codigo: "99888800", participaCorte: false, procesarHastaHora: 0, color: "#111827", provincia: "MISIONES" },
  { id: "suc-obera-proceso", nombre: "Oberá Proceso", codigo: "99887788", participaCorte: true, procesarHastaHora: 15, color: "#111827", provincia: "MISIONES" },
  { id: "suc-posadas", nombre: "Posadas", codigo: "99887722", participaCorte: true, procesarHastaHora: 15, color: "#7c3aed", provincia: "MISIONES" },
  { id: "suc-pto-rico", nombre: "Puerto Rico", codigo: "99887711", participaCorte: true, procesarHastaHora: 15, color: "#f08080", provincia: "MISIONES" },
  { id: "suc-san-vicente", nombre: "San Vicente", codigo: "99887700", participaCorte: true, procesarHastaHora: 15, color: "#8de6c1", provincia: "MISIONES" },
];

export function sucursalNombre(id: string): string {
  return SUCURSALES.find((s) => s.id === id)?.nombre ?? "—";
}

export function sucursalColor(id: string): string {
  return SUCURSALES.find((s) => s.id === id)?.color ?? "#94a3b8";
}
