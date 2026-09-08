import { getRutas, getSucursales, getLocalidades, getPersonal } from "@/server/db";
import { RutasView } from "./rutas-view";

export default async function RutasPage() {
  const [rutas, sucursales, localidades, personal] = await Promise.all([
    getRutas(),
    getSucursales(),
    getLocalidades(),
    getPersonal(),
  ]);
  return (
    <RutasView
      rutas={rutas}
      sucursales={sucursales}
      localidades={localidades}
      personal={personal}
    />
  );
}
