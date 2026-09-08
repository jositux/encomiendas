import { getMovimientosCrr } from "@/server/db";
import { CrrView } from "./crr-view";

export default async function CrrPage() {
  const movimientosCrr = await getMovimientosCrr();
  return <CrrView movimientosCrr={movimientosCrr} />;
}
