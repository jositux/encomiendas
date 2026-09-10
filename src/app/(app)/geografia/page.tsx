import { listLocalidades } from "@/server/services/localidades";
import { listProvincias } from "@/server/services/provincias";
import { listSectores } from "@/server/services/sectores";
import { listPuntos } from "@/server/services/puntos";
import { GeografiaView } from "./geografia-view";

export default async function GeografiaPage() {
  const [provincias, localidades, sectores, puntos] = await Promise.all([
    listProvincias(),
    listLocalidades(),
    listSectores(),
    listPuntos(),
  ]);
  return (
    <GeografiaView
      provincias={provincias}
      localidades={localidades}
      sectores={sectores}
      puntos={puntos}
    />
  );
}
