import { redirect, notFound } from "next/navigation";
import { getSession } from "@/server/session";
import { getPlanillaPorCodigo } from "@/server/services/custodia";
import { ApiError } from "@/server/api-client";
import { PlanillaPrintView } from "./planilla-view";

// Ruta de impresión de una planilla, a pedido del Feature A de "Cortar
// despacho" (2026-09-18, sección 32 del plan). Mismo patrón que
// /remito/[numero] (ver ese page.tsx): a propósito FUERA del grupo (app)
// para no arrastrar sidebar/header, y repite el chequeo de sesión a mano
// porque no hereda (app)/layout.tsx.
export default async function PlanillaPrintPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { codigo } = await params;

  let planilla;
  try {
    planilla = await getPlanillaPorCodigo(decodeURIComponent(codigo));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <PlanillaPrintView planilla={planilla} />;
}
