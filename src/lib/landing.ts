// NOTA-2026-09-24-01 (decidido: opcion 1, "landing por rol" -- aprobado
// en #cc-relay-humanos, ver hilo de NOTA-2026-09-24-01 en
// #cc-relay-aprobacion). SesionUsuario no tiene un campo de rol legible
// (ver types/index.ts: "no se inventan campos que el backend no tiene,
// solo permisos planos") -- se resuelve via permisos planos. Import sin
// dependencias de runtime (nada de "server-only", nada de next/headers)
// a proposito: lo usan tanto auth-actions.ts (Node, server action) como
// proxy.ts (Edge).
//
// BUG-2026-09-25-01: la primera version usaba solo `planillas:leer`, que
// NO es exclusivo del chofer -- operador, supervisor y administracion
// tambien lo tienen (es el permiso de GET /planillas/:codigo, no un rol).
// Con eso, todo operador del ambiente compartido aterrizaba en /chofer.
// Fix (propuesto por agent-back en el hilo del bug, aplicado tal cual):
// `envios:crear` es justo lo que separa al chofer del resto -- es lo que
// le falta para poder usar Nueva encomienda, que es el motivo original de
// NOTA-2026-09-24-01. planillas:leer sigue siendo necesario (sin el, ni
// siquiera ve el item "Chofer" del menu, ver nav-config.ts) pero ya no
// alcanza solo.
export function landingPathParaPermisos(permisos: string[]): string {
  const esChofer =
    permisos.includes("planillas:leer") && !permisos.includes("envios:crear");
  return esChofer ? "/chofer" : "/encomiendas/nueva";
}
