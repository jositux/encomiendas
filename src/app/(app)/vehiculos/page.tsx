import { getVehiculos, getPersonal } from "@/server/db";
import { VehiculosView } from "./vehiculos-view";

export default async function VehiculosPage() {
  const [vehiculos, personal] = await Promise.all([getVehiculos(), getPersonal()]);
  return <VehiculosView vehiculos={vehiculos} personal={personal} />;
}
