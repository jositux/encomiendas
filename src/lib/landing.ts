// NOTA-2026-09-24-01 (decidido: opcion 1, "landing por rol" -- aprobado
// en #cc-relay-humanos, ver hilo de NOTA-2026-09-24-01 en
// #cc-relay-aprobacion). SesionUsuario no tiene un campo de rol legible
// (ver types/index.ts: "no se inventan campos que el backend no tiene,
// solo permisos planos") -- el proxy real de "es un chofer" es el mismo
// permiso que ya gatea el item "Chofer" del menu lateral (nav-config.ts):
// `planillas:leer`. Import sin dependencias de runtime (nada de
// "server-only", nada de next/headers) a proposito: lo usan tanto
// auth-actions.ts (Node, server action) como proxy.ts (Edge).
export function landingPathParaPermisos(permisos: string[]): string {
  return permisos.includes("planillas:leer") ? "/chofer" : "/encomiendas/nueva";
}
