import { listLocalidades } from "@/server/services/localidades";
import { listProvincias } from "@/server/services/provincias";
import { LocalidadesView } from "./localidades-view";

export default async function LocalidadesPage() {
  const [localidades, provincias] = await Promise.all([
    listLocalidades(),
    listProvincias(),
  ]);
  return <LocalidadesView localidades={localidades} provincias={provincias} />;
}
