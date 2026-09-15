import { listRecorridos } from "@/server/services/recorridos";
import { listPuntos } from "@/server/services/puntos";
import { listLocalidades } from "@/server/services/localidades";
import { listUsuariosSeguro } from "@/server/services/usuarios";
import { listVehiculos } from "@/server/services/vehiculos";
import { RutasView } from "./rutas-view";

// 2026-09-15: mismo bug que en Seguimiento/Custodia (sección 18.2 del plan
// de integración) — GET /usuarios podía devolver 403 para un rol sin
// permiso de listarlos, y al estar en este mismo Promise.all tiraba abajo
// toda la pantalla. Se cambió a `listUsuariosSeguro()` (best-effort).
export default async function RutasPage() {
  const [rutas, puntos, localidades, usuarios, vehiculos] = await Promise.all([
    listRecorridos(),
    listPuntos(),
    listLocalidades(),
    listUsuariosSeguro(),
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
