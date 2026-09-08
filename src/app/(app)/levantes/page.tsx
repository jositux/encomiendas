import { getEncomiendas } from "@/server/db";
import { LevantesView } from "./levantes-view";

export default async function LevantesPage() {
  const encomiendas = await getEncomiendas();
  const pendientes = encomiendas.filter((e) => e.estado === "PENDIENTE");
  return <LevantesView pendientes={pendientes} />;
}
