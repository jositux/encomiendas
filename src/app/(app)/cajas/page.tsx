import { getEncomiendas, getPersonal } from "@/server/db";
import { getSession } from "@/server/session";
import { CierreCajaView } from "./cierre-view";

export default async function CierreCajaPage() {
  const [personal, encomiendas, session] = await Promise.all([
    getPersonal(),
    getEncomiendas(),
    getSession(),
  ]);
  return (
    <CierreCajaView
      personal={personal}
      encomiendas={encomiendas}
      defaultPersonalId={session?.usuarioId ?? personal[0]?.id ?? ""}
    />
  );
}
