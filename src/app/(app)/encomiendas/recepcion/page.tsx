import { getEncomiendas } from "@/server/db";
import { getSession } from "@/server/session";
import { RecepcionView } from "./recepcion-view";

export default async function RecepcionPage() {
  const [encomiendas, session] = await Promise.all([getEncomiendas(), getSession()]);
  const enTransito = encomiendas.filter((e) => e.estado === "EN_TRANSITO");
  return <RecepcionView enTransito={enTransito} sucursalId={session?.puntoId ?? null} />;
}
