// NOTA-2026-09-24-01 (decidido: opcion 1, "landing por rol" -- aprobado
// en #cc-relay-humanos, ver hilo de NOTA-2026-09-24-01 en
// #cc-relay-aprobacion). SesionUsuario no tiene un campo de rol legible
// (ver types/index.ts: "no se inventan campos que el backend no tiene,
// solo permisos planos") -- se resuelve via permisos planos. Import sin
// dependencias de runtime (nada de "server-only", nada de next/headers)
// a proposito: lo usan tanto auth-actions.ts (Node, server action) como
// proxy.ts (Edge).
//
// BUG-2026-09-25-01 (dos rondas -- ver hilo completo en #cc-relay):
// - Ronda 1: la version original usaba solo `planillas:leer`, que NO es
//   exclusiva del chofer (la tienen tambien operador/supervisor/admin).
//   Todo operador del ambiente compartido aterrizaba en /chofer.
// - Ronda 2 (el fix propuesto para la ronda 1 tambien fallo): agent-back
//   propuso `planillas:leer && !envios:crear`, verificado en vivo contra
//   operador nomas -- pero supervisor y administracion TAMPOCO tienen
//   envios:crear, asi que ese criterio los seguia mandando a /chofer.
//   Reproducido en vivo con supervisor real en test-encomiendas.vercel.app.
// Con las listas reales de los 5 roles (chofer/operador/supervisor/
// administracion/sistema, sacadas de la base, ver landing.test.ts).
// `entregas:registrar` es el UNICO permiso que separa de verdad al chofer
// del resto:
//   chofer          entregas:registrar=si  envios:crear=no
//   operador        entregas:registrar=no  envios:crear=si
//   supervisor      entregas:registrar=no  envios:crear=no
//   administracion  entregas:registrar=no  envios:crear=no
//   sistema         entregas:registrar=si  envios:crear=si
// El `!envios:crear` sigue haciendo falta para excluir a `sistema`, que
// tiene los 25 permisos (incluido entregas:registrar).
//
// NOTA-2026-09-28-01 (aprobada opcion 1 en #cc-relay-humanos, detalle en
// #cc-relay-aprobacion): supervisor y administracion tampoco tienen
// envios:crear, asi que "Nueva encomienda" no es su pantalla tampoco --
// arreglado el bug de arriba, seguian aterrizando ahi sin poder guardar.
// Cada uno entra a lo que hace todos los dias:
//   supervisor      -> /despachos (permiso distintivo: despachos:crear,
//                      que administracion NO tiene)
//   administracion  -> /deposito, pestaña "Conf. pendientes"
//                      (permiso distintivo: confirmaciones:confirmar)
// El orden de los checks importa: `envios:crear` filtra primero a
// operador Y sistema (ambos lo tienen), antes de mirar despachos:crear/
// confirmaciones:confirmar -- si no, `sistema` (que tambien tiene esos
// dos permisos) terminaria mal clasificado como supervisor.
export function landingPathParaPermisos(permisos: string[]): string {
  const esChofer =
    permisos.includes("entregas:registrar") && !permisos.includes("envios:crear");
  if (esChofer) return "/chofer";
  if (permisos.includes("envios:crear")) return "/encomiendas/nueva";
  if (permisos.includes("despachos:crear")) return "/despachos";
  if (permisos.includes("confirmaciones:confirmar")) return "/deposito?tab=confirmaciones";
  return "/encomiendas/nueva";
}
