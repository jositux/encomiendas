import { getEncomiendas } from "@/server/db";
import { PendientesView } from "./pendientes-view";

export default async function PendientesPage() {
  const encomiendas = await getEncomiendas();
  const pendientes = encomiendas.filter((e) => e.estado === "PENDIENTE");
  return <PendientesView pendientes={pendientes} />;
}
