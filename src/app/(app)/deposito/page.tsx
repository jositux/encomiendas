import { getSession } from "@/server/session";
import { listConsultaEnvios } from "@/server/services/consultas";
import { listLocalidadesSeguro } from "@/server/services/localidades";
import { listSectoresSeguro } from "@/server/services/sectores";
import { listUsuariosSeguro } from "@/server/services/usuarios";
import { DepositoView } from "./deposito-view";

// Reemplaza a la vieja pantalla mock de Depósito (getEncomiendas/getPersonal,
// modelo "Encomienda" que no existe en el backend real) — contrato completo
// pasado por el equipo de backend el 2026-09-18 ("Nota 1 — Pantalla de
// Depósito"), ver claude/plan-integracion-backend.md sección 35. Un único
// endpoint (GET /consultas/envios) alimenta toda la pantalla: las pestañas
// se arman con `estado` + `ubicacion` que ya trae cada fila, NUNCA con un
// estado propio inventado del lado del cliente.
//
// Pestaña inicial (Pendientes = estado REGISTRADO) se trae server-side para
// el primer render; el resto de las pestañas y los filtros se piden desde
// el cliente vía `consultarEnviosAction` (Server Action), re-consultando en
// cada cambio de pestaña/filtro y después de cada mutación — nunca movemos
// una fila "a mano" del lado del cliente (regla explícita del contrato).
//
// `localidades`/`sectores`/`usuarios` van con la variante "Seguro"
// (best-effort): hacen falta para los filtros y los diálogos de
// corregir-sector/mover/confirmar-con-entrega, pero su ausencia no debería
// tirar abajo la pantalla si el rol actual no tiene `geografia:leer`/
// `usuarios:leer` — misma idea que ya usan Custodia/Chofer/Seguimiento.
export default async function DepositoPage() {
  const [session, inicial, localidades, sectores, usuarios] = await Promise.all([
    getSession(),
    listConsultaEnvios({ estado: "REGISTRADO" }),
    listLocalidadesSeguro(),
    listSectoresSeguro(),
    listUsuariosSeguro(),
  ]);
  return (
    <DepositoView
      inicial={inicial}
      localidades={localidades}
      sectores={sectores}
      usuarios={usuarios}
      permisos={session?.permisos ?? []}
    />
  );
}
