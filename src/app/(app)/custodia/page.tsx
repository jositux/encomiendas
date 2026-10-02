import { getSession } from "@/server/session";
import { ApiError } from "@/server/api-client";
import {
  listCustodios,
  listEnviosEnCustodia,
  type CustodioApi,
  type PaginaDeEnviosEnCustodia,
} from "@/server/services/custodia";
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
// (`alcance`: propio / base / todo), con el custodio, el punto y la
// localidad de destino ya resueltos a nombres, y paginación real. Ya no
// pide GET /envios, GET /usuarios ni GET /puntos, ni ningún catálogo.
//
// El filtro y la página viven en la URL (`?persona=…&pagina=…`): cambiar el
// selector o de página es una navegación, y esta página vuelve a pedir los
// datos. `persona` es "mios", el id de una persona, o nada (la vista por
// defecto del alcance: todo lo que se puede ver).
export default async function CustodiaPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; pagina?: string }>;
}) {
  const [{ persona, pagina }, session] = await Promise.all([searchParams, getSession()]);

  const usuarioId = session?.usuarioId ?? "";
  const numeroDePagina = paginaValida(pagina);
  const seleccion = persona ?? "";
  const custodioId = seleccion === PERSONA_MIOS ? usuarioId : seleccion;

  // Un rechazo del backend (p. ej. 403 FUERA_DE_ALCANCE por un `persona`
  // escrito a mano en la URL) se muestra en la pantalla, con el camino de
  // vuelta a la lista sin filtro, en vez de la página de error genérica.
  let envios: PaginaDeEnviosEnCustodia | null = null;
  let custodios: CustodioApi[] = [];
  let totalSinFiltro = 0;
  let error: { title: string; message: string } | undefined;
  try {
    const [paginaDeEnvios, personas, sinFiltro] = await Promise.all([
      listEnviosEnCustodia({
        usuarioId: custodioId || undefined,
        limite: TAMANO_DE_PAGINA,
        offset: (numeroDePagina - 1) * TAMANO_DE_PAGINA,
      }),
      listCustodios(),
      // El "Todos (n)" del selector es el `total` de la lista SIN filtro, no
      // la suma de las cantidades por persona (que se queda corta si hay
      // más custodios que los que entran en una página de /custodios). Con
      // una persona elegida ese total no viene en la página pedida: se pide
      // aparte, con una sola fila.
      custodioId ? listEnviosEnCustodia({ limite: 1 }) : null,
    ]);
    envios = paginaDeEnvios;
    custodios = personas.datos;
    totalSinFiltro = (sinFiltro ?? paginaDeEnvios).total;
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    error = { title: err.title, message: err.message };
  }

  return (
    <CustodiaView
      envios={envios}
      custodios={custodios}
      totalSinFiltro={totalSinFiltro}
      usuarioId={usuarioId}
      seleccion={seleccion}
      error={error}
    />
  );
}
