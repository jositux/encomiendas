import { getClientes, getEncomiendas } from "@/server/db";
import { getSession } from "@/server/session";
import { NuevaEncomiendaView } from "./nueva-view";

export default async function NuevaEncomiendaPage() {
  const [encomiendas, clientes, session] = await Promise.all([
    getEncomiendas(),
    getClientes(),
    getSession(),
  ]);
  return <NuevaEncomiendaView encomiendas={encomiendas} clientes={clientes} session={session} />;
}
