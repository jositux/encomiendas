import { listUsuarios } from "@/server/services/usuarios";
import { listRolesSeguro } from "@/server/services/roles";
import { listPuntosSeguro } from "@/server/services/puntos";
import { UsuariosView } from "./usuarios-view";

// Reemplaza a la vieja pantalla mock de "Personal" (src/lib/mock/personal.ts
// + src/server/db.ts) — ver claude/plan-integracion-backend.md, sección 34.
// A propósito NO se tocó el mock: Cajas y Depósito (/cajas, /deposito)
// siguen leyendo `getPersonal()` de la base mock para su propio modelo
// (DNI, tipoPersonal, cajaHabilitada, grupoRutaId — conceptos que el
// backend real no tiene), así que esta pantalla es una administración de
// usuarios/roles NUEVA y separada, no una migración 1:1 de la vieja.
//
// `listUsuarios()` sin "Seguro": es el dato central de esta pantalla — si
// el usuario logueado no puede listar usuarios, no tiene sentido mostrar la
// pantalla con una lista vacía (mismo criterio que `listRecorridos()` en
// /despachos). `roles`/`puntos` sí van con la variante "Seguro": hacen
// falta para los combos de alta/edición, pero su ausencia no debería tirar
// abajo el LISTADO de usuarios si el rol actual no puede leerlos.
export default async function UsuariosPage() {
  const [usuarios, roles, puntos] = await Promise.all([
    listUsuarios(),
    listRolesSeguro(),
    listPuntosSeguro(),
  ]);
  return <UsuariosView usuarios={usuarios} roles={roles} puntos={puntos} />;
}
