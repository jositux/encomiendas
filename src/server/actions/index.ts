// Barrel: reexporta todas las Server Actions desde un solo punto de
// entrada, para que los ~20 archivos que hoy hacen
// `import { xAction } from "@/server/actions"` no tengan que cambiar nada.
//
// actions.ts (511 líneas, todo junto, organizado solo por comentarios de
// sección `// -- Nombre --`) se partió en esta carpeta, un archivo por
// dominio — mismo criterio que ya usa src/server/services/* — el
// 2026-09-17. Ver claude/plan-integracion-backend.md, sección 29, y
// claude/esquema-permisos.md para el estado de permisos de cada acción.
//
// Cada archivo es 100% real (habla contra el backend, vía services/*) o
// 100% mock (habla contra db.ts) — nunca mezcla las dos fuentes, a
// diferencia del actions.ts viejo donde esa regla dependía de respetar el
// comentario de encabezado a mano.

export * from "./encomiendas";
export * from "./clientes";
export * from "./personal";
export * from "./vehiculos";
export * from "./puntos";
export * from "./localidades";
export * from "./provincias";
export * from "./sectores";
export * from "./rutas";
export * from "./envios";
export * from "./seguimiento";
export * from "./chofer";
export * from "./despachos";
export * from "./cajas";
export * from "./crr";
export * from "./demo";

export type { AccionResultado, ResultadoConDato } from "./shared";
