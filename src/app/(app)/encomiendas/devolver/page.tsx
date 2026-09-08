import { getEncomiendas } from "@/server/db";
import { DevolverView } from "./devolver-view";

export default async function DevolverPage() {
  const encomiendas = await getEncomiendas();
  const candidatas = encomiendas.filter(
    (e) => e.estado === "EN_TRANSITO" || e.estado === "PARA_ENTREGAR"
  );
  return <DevolverView candidatas={candidatas} />;
}
