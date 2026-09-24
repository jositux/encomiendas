import { getSession } from "@/server/session";
import { listDespachos } from "@/server/services/custodia";
import { listLocalidades } from "@/server/services/localidades";
import { ChoferView } from "@/app/(app)/chofer/chofer-view";

// Misma pantalla y misma lógica que (app)/chofer/page.tsx (ver ese archivo
// para el detalle de cada permiso/fetch) — se reutiliza ChoferView tal cual,
// sin duplicar nada de la lógica de negocio ni de permisos. Lo único que
// cambia acá es el CHROME alrededor: esta ruta vive fuera del grupo (app),
// así que no pasa por (app)/layout.tsx ni monta el sidebar de oficina —
// ver chofer-minimal/layout.tsx para el porqué.
export default async function ChoferMinimalPage() {
  const session = await getSession();
  const puedeVerDespachos = !!session?.permisos.includes("despachos:leer");

  const [despachos, localidades] = await Promise.all([
    puedeVerDespachos ? listDespachos() : Promise.resolve([]),
    puedeVerDespachos ? listLocalidades() : Promise.resolve([]),
  ]);

  return (
    <ChoferView
      despachos={despachos}
      localidades={localidades}
      puedeVerDespachos={puedeVerDespachos}
      permisos={session?.permisos ?? []}
      usuarioId={session?.usuarioId ?? ""}
    />
  );
}
