import { listVehiculos } from "@/server/services/vehiculos";
import { VehiculosView } from "./vehiculos-view";

export default async function VehiculosPage() {
  const vehiculos = await listVehiculos();
  return <VehiculosView vehiculos={vehiculos} />;
}
