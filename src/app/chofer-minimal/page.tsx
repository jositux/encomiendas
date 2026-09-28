import { getSession } from "@/server/session";
import { ChoferView } from "@/app/(app)/chofer/chofer-view";

// Misma pantalla y misma lógica que (app)/chofer/page.tsx (ver ese archivo
// para el detalle de cada permiso/fetch) — se reutiliza ChoferView tal cual,
// sin duplicar nada de la lógica de negocio ni de permisos. Lo único que
// cambia acá es el CHROME alrededor: esta ruta vive fuera del grupo (app),
// así que no pasa por (app)/layout.tsx ni monta el sidebar de oficina —
// ver chofer-minimal/layout.tsx para el porqué.
//
// 2026-09-28: ver (app)/chofer/page.tsx — se sacó la búsqueda secundaria
// "por Despacho + Localidad" de ChoferView, así que esta ruta ya no
// necesita listDespachos()/listLocalidades().
export default async function ChoferMinimalPage() {
  const session = await getSession();

  return (
    <ChoferView
      permisos={session?.permisos ?? []}
      usuarioId={session?.usuarioId ?? ""}
    />
  );
}
