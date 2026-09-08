import { getLocalidades } from "@/server/db";
import { LocalidadesView } from "./localidades-view";

export default async function LocalidadesPage() {
  const localidades = await getLocalidades();
  return <LocalidadesView localidades={localidades} />;
}
