import { getSucursales } from "@/server/db";
import { SucursalesView } from "./sucursales-view";

export default async function SucursalesPage() {
  const sucursales = await getSucursales();
  return <SucursalesView sucursales={sucursales} />;
}
