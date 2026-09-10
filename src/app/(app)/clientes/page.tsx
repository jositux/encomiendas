import { listClientes } from "@/server/services/clientes";
import { listLocalidades } from "@/server/services/localidades";
import { listSectores } from "@/server/services/sectores";
import { ClientesView } from "./clientes-view";

export default async function ClientesPage() {
  const [clientes, localidades, sectores] = await Promise.all([
    listClientes(),
    listLocalidades(),
    listSectores(),
  ]);
  return <ClientesView clientes={clientes} localidades={localidades} sectores={sectores} />;
}
