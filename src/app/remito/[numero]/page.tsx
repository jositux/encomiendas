import { redirect, notFound } from "next/navigation";
import { getSession } from "@/server/session";
import { getRemito } from "@/server/services/envios";
import { ApiError } from "@/server/api-client";
import { RemitoView } from "./remito-view";

// Ruta a propósito FUERA del grupo (app): el remito se imprime, así que no
// tiene que llevar el sidebar/header de la app alrededor. Como no hereda
// (app)/layout.tsx (que es lo que hoy protege esas rutas — no hay
// middleware.ts en este proyecto), esta página repite el mismo chequeo de
// sesión a mano.
export default async function RemitoPage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { numero } = await params;

  let remito;
  try {
    remito = await getRemito(decodeURIComponent(numero));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <RemitoView remito={remito} />;
}
