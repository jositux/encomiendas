import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { getSession } from "@/server/session";
import { listPuntosSeguro } from "@/server/services/puntos";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El middleware ya protege estas rutas, pero se vuelve a chequear acá por
  // las dudas (defensa en profundidad) y porque necesitamos los datos de la
  // sesión para pintar el header.
  const session = await getSession();
  if (!session) redirect("/login");

  // 2026-09-17: antes buscaba la sucursal en datos mock (getSucursales())
  // comparando contra el puntoId real del backend -- nunca coincidía para
  // ningún usuario real. Ver sección 28 del plan de integración.
  const puntos = await listPuntosSeguro();
  const sucursal = puntos.find((p) => p.id === session.puntoId) ?? null;

  return (
    <div className="flex h-svh w-full overflow-hidden bg-muted/30">
      <AppSidebar permisos={session.permisos} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader session={session} sucursal={sucursal} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
