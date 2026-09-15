import { redirect } from "next/navigation";

// "Pendientes" se consolidó dentro de "Depósito" (una pestaña ahí), junto con
// Recepción, Designaciones, Devolver, Encomiendas activas y Pendientes. Se
// deja este redirect en vez de borrar la ruta por si algo todavía apunta al
// link viejo.
export default function PendientesPage() {
  redirect("/deposito");
}
