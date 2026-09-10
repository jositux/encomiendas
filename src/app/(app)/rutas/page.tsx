import { listRecorridos } from "@/server/services/recorridos";
import { listPuntos } from "@/server/services/puntos";
import { listLocalidades } from "@/server/services/localidades";
import { listUsuarios } from "@/server/services/usuarios";
import { listVehiculos } from "@/server/services/vehiculos";
import { RutasView } from "./rutas-view";

export default async function RutasPage() {
  const [rutas, puntos, localidades, usuarios, vehiculos] = await Promise.all([
    listRecorridos(),
    listPuntos(),
    listLocalidades(),
    listUsuarios(),
    listVehiculos(),
  ]);
  const bases = puntos.filter((p) => p.tipo === "base");
  const activas = rutas.filter((r) => r.activo);
  return (
    <RutasView
      rutas={activas}
      bases={bases}
      localidades={localidades}
      usuarios={usuarios}
      vehiculos={vehiculos}
    />
  );
}
