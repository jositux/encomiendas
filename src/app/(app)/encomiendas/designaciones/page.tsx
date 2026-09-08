import { getEncomiendas, getPersonal } from "@/server/db";
import { DesignacionesView } from "./designaciones-view";

export default async function DesignacionesPage() {
  const [encomiendas, personal] = await Promise.all([getEncomiendas(), getPersonal()]);
  const paraEntregar = encomiendas.filter((e) => e.estado === "PARA_ENTREGAR");
  const repartidores = personal.filter((p) => p.permisos.levantes && p.activo);
  return <DesignacionesView paraEntregar={paraEntregar} repartidores={repartidores} />;
}
