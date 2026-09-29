import { getSession } from "@/server/session";
import { listConsultaEnvios } from "@/server/services/consultas";
import { listLocalidadesSeguro } from "@/server/services/localidades";
import { listSectoresSeguro } from "@/server/services/sectores";
import { listUsuariosSeguro } from "@/server/services/usuarios";
import { ApiError } from "@/server/api-client";
import { DepositoView, tabValida } from "./deposito-view";

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
//
// BUG visto en vivo 2026-09-29 (reportado por el usuario probando como
// operador, reproducido también con `pnpm dev` local): a diferencia de
// localidades/sectores/usuarios de arriba, la carga inicial de "Pendientes"
// (`listConsultaEnvios`, el DATO CENTRAL de la pantalla) se pedía SIN
// atrapar el error -- si el rol logueado no puede leer ese endpoint (o el
// backend responde cualquier otro error), el throw sin atrapar en este
// Server Component tira abajo TODA la pantalla con el error genérico de
// Next.js ("This page couldn't load"), en vez de mostrar el error real como
// hace el resto de la pantalla (cambiar de pestaña/buscar ya atrapa el
// error y lo muestra con un toast, ver deposito-view.tsx). Ahora se atrapa
// acá mismo (mismo patrón `comoResultado` que ya usa el resto de la app) y
// se manda el mensaje real del backend a DepositoView como `errorInicial`,
// que lo muestra con un toast al montar en vez de dejar que la pantalla
// explote. El dato central sigue siendo obligatorio para que la pantalla
// tenga sentido (no se degrada a "Seguro" silencioso) -- la diferencia es
// que ahora el usuario VE el motivo real en vez de una pantalla en blanco.
export default async function DepositoPage({
  searchParams,
}: {
  // NOTA-2026-09-28-01: administracion aterriza en
  // `/deposito?tab=confirmaciones` (ver landing.ts) -- `tabValida` descarta
  // cualquier valor que no sea una pestaña real (typo, link viejo, etc.),
  // dejando el default de siempre ("Pendientes").
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ tab }, session, localidades, sectores, usuarios] = await Promise.all([
    searchParams,
    getSession(),
    listLocalidadesSeguro(),
    listSectoresSeguro(),
    listUsuariosSeguro(),
  ]);

  let inicial;
  let errorInicial: { title: string; message: string } | undefined;
  try {
    inicial = await listConsultaEnvios({ estado: "REGISTRADO" });
  } catch (err) {
    inicial = { datos: [], total: 0, limite: 200, offset: 0 };
    errorInicial =
      err instanceof ApiError
        ? { title: err.title, message: err.message }
        : {
            title: "No se pudo cargar Depósito",
            message: err instanceof Error ? err.message : String(err),
          };
  }

  return (
    <DepositoView
      inicial={inicial}
      errorInicial={errorInicial}
      localidades={localidades}
      sectores={sectores}
      usuarios={usuarios}
      permisos={session?.permisos ?? []}
      tabInicial={tabValida(tab)}
    />
  );
}
