import { getMovimientosCrr } from "@/server/db";
import { MercadoPagoView } from "./mercadopago-view";

export default async function MercadoPagoPage() {
  const movimientosCrr = await getMovimientosCrr();
  return <MercadoPagoView movimientosCrr={movimientosCrr} />;
}
