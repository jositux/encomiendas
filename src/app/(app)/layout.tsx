import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { getSession } from "@/server/session";
import { getSucursales } from "@/server/db";

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

  const sucursales = await getSucursales();
  const sucursal = sucursales.find((s) => s.id === session.puntoId) ?? null;

  return (
    <div className="flex h-svh w-full overflow-hidden bg-muted/30">
      <AppSidebar />
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
