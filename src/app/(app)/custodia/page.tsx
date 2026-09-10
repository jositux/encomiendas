import { listEnvios } from "@/server/services/envios";
import { listUsuarios } from "@/server/services/usuarios";
import { listPuntos } from "@/server/services/puntos";
import { CustodiaView } from "./custodia-view";

// Trazabilidad de custodia: quién tiene cada envío ahora mismo y en qué
// punto. Usa /envios real (el mismo endpoint real ya usado en "Envíos
// recientes" de Nueva Encomienda) — el resto de la app (Tablero, Encomiendas
// activas, etc.) todavía corre sobre el mock, así que esta es la segunda
// pantalla conectada al backend real.
export default async function CustodiaPage() {
  const [envios, usuarios, puntos] = await Promise.all([
    listEnvios({ limite: 100 }),
    listUsuarios(),
    listPuntos(),
  ]);
  return <CustodiaView envios={envios} usuarios={usuarios} puntos={puntos} />;
}
