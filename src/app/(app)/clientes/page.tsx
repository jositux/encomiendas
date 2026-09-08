import { getClientes } from "@/server/db";
import { ClientesView } from "./clientes-view";

export default async function ClientesPage() {
  const clientes = await getClientes();
  return <ClientesView clientes={clientes} />;
}
