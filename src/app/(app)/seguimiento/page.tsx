import { getSession } from "@/server/session";
import { listLocalidades } from "@/server/services/localidades";
import { listSectores } from "@/server/services/sectores";
import { listUsuariosSeguro } from "@/server/services/usuarios";
import { listEnvios } from "@/server/services/envios";
import { SeguimientoView } from "./seguimiento-view";

// "Seguimiento de envío": pantalla nueva a partir del contrato entregado
// por el backend (GET /envios/{numero}/seguimiento + búsqueda por guía +
// 6 acciones contextuales). Ver src/server/services/seguimiento.ts para el
// detalle del contrato y cómo se confirmó en vivo.
//
// 2026-09-11 (continuación): la pantalla arrancaba completamente vacía
// hasta que alguien buscaba algo — el usuario pidió que al entrar sin
// buscar aparezca algo. Se agregó `listEnvios({limite: 20})` acá (mismo
// patrón que el panel "Envíos recientes" de Nueva Encomienda) para mostrar
// los envíos más recientes como punto de partida, elegibles con un click
// para ver su seguimiento completo sin tener que saber el número de memoria.
//
// 2026-09-15: reportado por backend — un operador sin permiso para listar
// todos los usuarios recibe 403 en GET /usuarios, y como esta llamada
// estaba en el mismo Promise.all que arma la página, un 403 acá tiraba
// abajo TODA la pantalla de Seguimiento para ese rol (error de Server
// Components sin detalle en producción, "Minified React error #441").
// El nombre de quien hizo cada evento ya viene en la respuesta de
// /envios/{numero}/seguimiento (responsable.nombre) — no depende de esto.
// Lo único que de verdad usa `usuarios` acá es el selector de chofer del
// diálogo "Registrar entrega y confirmar" (ver seguimiento-view.tsx). Por
// eso se usa `listUsuariosSeguro()` (best-effort, ver services/usuarios.ts):
// si falla (403 u otra cosa), la pantalla igual carga y ese selector queda
// vacío en vez de romper todo. Mismo bug encontrado y corregido en Custodia
// y Rutas/Recorridos — ver sección 18.2 del plan de integración.

export default async function SeguimientoPage() {
  const [session, localidades, sectores, usuarios, envios] = await Promise.all([
    getSession(),
    listLocalidades(),
    listSectores(),
    listUsuariosSeguro(),
    listEnvios({ limite: 20 }),
  ]);

  const enviosRecientes = [...envios].sort(
    (a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()
  );

  return (
    <SeguimientoView
      permisos={session?.permisos ?? []}
      localidades={localidades}
      sectores={sectores}
      choferes={usuarios.filter((u) => u.activo && u.tipoChofer !== null)}
      enviosRecientes={enviosRecientes}
    />
  );
}
