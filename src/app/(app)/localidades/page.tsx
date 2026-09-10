import { redirect } from "next/navigation";

// Localidades se consolidó dentro de "Geografía" (una pestaña ahí), junto
// con Provincias, Sectores/Zonas y Puntos. Se deja este redirect en vez de
// borrar la ruta por si algo todavía apunta al link viejo.
export default function LocalidadesPage() {
  redirect("/geografia");
}
