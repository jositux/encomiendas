import { getSession } from "@/server/session";
import { RecepcionView } from "./recepcion-view";

// NOTA-2026-09-28-03 (menús por rol): pantalla nueva del operador —
// recepción de un envío suelto en un solo paso (buscar + recibir con un
// único click), sin pasar por el flujo de dos pasos que sigue teniendo
// BuscadorEnvioSuelto en /chofer. Ver recepcion-view.tsx para el detalle
// completo.
export default async function RecepcionPage() {
  const session = await getSession();

  return (
    <RecepcionView
      permisos={session?.permisos ?? []}
      usuarioId={session?.usuarioId ?? ""}
    />
  );
}
