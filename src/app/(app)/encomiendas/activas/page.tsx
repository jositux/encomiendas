import { getEncomiendas } from "@/server/db";
import { ActivasView } from "./activas-view";

export default async function EncomiendasActivasPage() {
  const encomiendas = await getEncomiendas();
  return <ActivasView encomiendas={encomiendas} />;
}
