import { getEncomiendas } from "@/server/db";
import { getSession } from "@/server/session";
import { PanelView } from "./panel-view";

export default async function PanelPage() {
  const [encomiendas, session] = await Promise.all([getEncomiendas(), getSession()]);

  return <PanelView encomiendas={encomiendas} personalId={session?.usuarioId ?? null} />;
}
