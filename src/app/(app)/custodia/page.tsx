import { getSession } from "@/server/session";
import { ApiError } from "@/server/api-client";
import {
  listCustodios,
  listEnviosEnCustodia,
  type CustodioApi,
  type PaginaDeEnviosEnCustodia,
} from "@/server/services/custodia";
import { listLocalidadesSeguro } from "@/server/services/localidades";
import { CustodiaView } from "./custodia-view";
import { PERSONA_MIOS, TAMANO_DE_PAGINA, paginaValida } from "./custodia-url";

// Custodia: qué tiene cada uno ahora (2026-10-02). Hasta acá esta pantalla
// pedía GET /envios?limite=100 y mostraba lo que viniera -- envíos en
// cualquier estado, de cualquier persona, igual para todos los roles -- y
// armaba el nombre del custodio con GET /usuarios, que casi ningún rol
// puede leer (la columna salía vacía).
//
// Ahora lee GET /custodia/envios: solo envíos que están en custodia de una
// persona, dentro de lo que el BACKEND deja ver a quien consulta
// (`alcance`: propio / base / todo), con el custodio y el punto ya
// resueltos a nombres y paginación real. Ya no pide GET /envios, GET
// /usuarios ni GET /puntos.
//
// El filtro y la página viven en la URL (`?persona=…&pagina=…`): cambiar el
// selector o de página es una navegación, y esta página vuelve a pedir los
// datos. `persona` es "mios", el id de una persona, o nada (la vista por
// defecto del alcance: todo lo que se puede ver).
//
// `localidades` solo traduce la localidad de destino a su nombre; es
// best-effort (ver services/localidades.ts): si falla, esa columna queda
// en "—" y la pantalla carga igual.
export default async function CustodiaPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; pagina?: string }>;
}) {
  const [{ persona, pagina }, session, localidades] = await Promise.all([
    searchParams,
    getSession(),
    listLocalidadesSeguro(),
  ]);

  const usuarioId = session?.usuarioId ?? "";
  const numeroDePagina = paginaValida(pagina);
  const seleccion = persona ?? "";
  const custodioId = seleccion === PERSONA_MIOS ? usuarioId : seleccion;

  // Un rechazo del backend (p. ej. 403 FUERA_DE_ALCANCE por un `persona`
  // escrito a mano en la URL) se muestra en la pantalla, con el camino de
  // vuelta a la lista sin filtro, en vez de la página de error genérica.
  let envios: PaginaDeEnviosEnCustodia | null = null;
  let custodios: CustodioApi[] = [];
  let error: { title: string; message: string } | undefined;
  try {
    const [paginaDeEnvios, personas] = await Promise.all([
      listEnviosEnCustodia({
        usuarioId: custodioId || undefined,
        limite: TAMANO_DE_PAGINA,
        offset: (numeroDePagina - 1) * TAMANO_DE_PAGINA,
      }),
      listCustodios(),
    ]);
    envios = paginaDeEnvios;
    custodios = personas.datos;
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    error = { title: err.title, message: err.message };
  }

  return (
    <CustodiaView
      envios={envios}
      custodios={custodios}
      localidades={localidades}
      usuarioId={usuarioId}
      seleccion={seleccion}
      error={error}
    />
  );
}
