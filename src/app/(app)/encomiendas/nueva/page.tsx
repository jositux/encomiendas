import { listLocalidades } from "@/server/services/localidades";
import { listSectores } from "@/server/services/sectores";
import { listEnvios } from "@/server/services/envios";
import { getSession } from "@/server/session";
import { NuevaEncomiendaView } from "./nueva-view";

export default async function NuevaEncomiendaPage() {
  const [localidades, sectores, envios, session] = await Promise.all([
    listLocalidades(),
    listSectores(),
    listEnvios({ limite: 50 }),
    getSession(),
  ]);
  return (
    <NuevaEncomiendaView
      localidades={localidades}
      sectores={sectores}
      envios={envios}
      session={session}
    />
  );
}
