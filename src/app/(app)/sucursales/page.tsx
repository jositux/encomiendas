import { redirect } from "next/navigation";

// Sucursales se consolidó dentro de "Geografía" (pestaña "Puntos y
// sucursales"), junto con Provincias, Localidades y Sectores/Zonas. Se deja
// este redirect en vez de borrar la ruta por si algo todavía apunta al link
// viejo.
export default function SucursalesPage() {
  redirect("/geografia");
}
