import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { ChoferMinimalHeader } from "./chofer-minimal-header";

// Layout dedicado a /chofer-minimal (2026-09-24, "opción 2" de la charla
// sobre UX mobile del rol chofer). A propósito NO vive dentro del grupo
// (app) ni reutiliza (app)/layout.tsx: ese layout siempre monta <AppSidebar>
// con los 12 ítems del menú de oficina (nav-config.ts) — exactamente lo que
// esta ruta busca evitarle a un chofer real con el celular en la mano.
//
// Esta pantalla es una app de una sola pantalla, sin nada para navegar mal:
// sin sidebar, sin selector de sección, `max-w-lg` centrado para que incluso
// abierta en un monitor de escritorio siga teniendo el ancho de un
// celular (no tiene sentido "aprovechar" una pantalla ancha para un flujo
// que es, por diseño, de uso en la calle).
//
// La protección real de la ruta la hace el proxy (src/proxy.ts): cualquier
// path sin cookie de sesión redirige a /login. Este chequeo acá es solo
// defensa en profundidad, mismo criterio que (app)/layout.tsx.
export default async function ChoferMinimalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-muted/30">
      <ChoferMinimalHeader session={session} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 py-4">{children}</div>
      </main>
    </div>
  );
}
