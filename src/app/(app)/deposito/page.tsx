import { getEncomiendas, getPersonal } from "@/server/db";
import { getSession } from "@/server/session";
import { DepositoView } from "./deposito-view";

// "Mi depósito" consolidó 5 pantallas separadas (Recepción, Designaciones,
// Devolver, Encomiendas activas, Pendientes) — todas eran vistas filtradas
// del mismo modelo mock (Encomienda), con la mayoría de las acciones ya
// centralizadas en EncomiendaDetailSheet. Se unificaron en una sola vista
// con pestañas por estado. Custodia queda aparte (está conectada al backend
// real y es conceptualmente distinta: quién tiene el envío, no un estado
// del ciclo de vida mock).
export default async function DepositoPage() {
  const [encomiendas, personal, session] = await Promise.all([
    getEncomiendas(),
    getPersonal(),
    getSession(),
  ]);
  const repartidores = personal.filter((p) => p.permisos.levantes && p.activo);
  return (
    <DepositoView
      encomiendas={encomiendas}
      repartidores={repartidores}
      sucursalId={session?.puntoId ?? null}
    />
  );
}
