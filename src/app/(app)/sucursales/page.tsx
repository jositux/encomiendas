import { listPuntos } from "@/server/services/puntos";
import { listLocalidades } from "@/server/services/localidades";
import { SucursalesView } from "./sucursales-view";

export default async function SucursalesPage() {
  const [sucursales, localidades] = await Promise.all([listPuntos(), listLocalidades()]);
  return <SucursalesView sucursales={sucursales} localidades={localidades} />;
}
