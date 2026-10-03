"use client";

import * as React from "react";

import { sonar } from "@/lib/sonidos";
import { procesarLecturaAction } from "@/server/actions";
import {
  asignacionParaDeshacer,
  claveDeTanda,
  conDeshecha,
  conLectura,
  conResultado,
  enCola,
  esRebote,
  leerTanda,
  modoListo,
  modosDisponibles,
  nuevaLectura,
  otraVezEnCola,
  pedidoDeLectura,
  resultadoDeRespuesta,
  resultadoSinRespuesta,
  serializarTanda,
  tandaVacia,
  type Lectura,
  type Modo,
  type ResultadoDeLectura,
  type Tanda,
} from "./recepcion-tanda";

function nuevoClientUuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cid-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

// El navegador puede no tener almacenamiento (modo privado, cuota llena):
// la tanda sigue funcionando en memoria, solo deja de sobrevivir a una
// recarga.
function leerGuardado(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardar(clave: string, tanda: Tanda) {
  try {
    window.localStorage.setItem(clave, serializarTanda(tanda));
  } catch {
    // Sin almacenamiento: ver arriba.
  }
}

// El estado de una tanda de Recepción y su cola de lecturas.
//
// La cola: cada lectura entra a la tanda como "en_cola" en el momento en
// que se escanea y un único bucle las manda de a una, en orden. Escanear
// mientras otra lectura espera al backend no pierde nada ni pisa nada: la
// nueva queda atrás en la cola. El estado "de verdad" vive en un ref (el
// bucle corre entre renders); el `useState` es su copia para pintar.
//
// Solo se monta en el navegador (ver RecepcionView): el estado inicial sale
// de lo guardado, que en el servidor no existe.
export function useTanda({ permisos, usuarioId }: { permisos: string[]; usuarioId: string }) {
  const clave = claveDeTanda(usuarioId);
  const recibe = permisos.includes("custodia:registrar");

  const [tanda, setTanda] = React.useState<Tanda>(() => leerTanda(leerGuardado(clave), permisos));
  const tandaRef = React.useRef(tanda);
  const [ultimoId, setUltimoId] = React.useState<string | null>(null);
  const [deshaciendoId, setDeshaciendoId] = React.useState<string | null>(null);
  const drenandoRef = React.useRef(false);

  const actualizar = React.useCallback(
    (cambio: (t: Tanda) => Tanda) => {
      tandaRef.current = cambio(tandaRef.current);
      setTanda(tandaRef.current);
      guardar(clave, tandaRef.current);
    },
    [clave]
  );

  const avisar = React.useCallback((resultado: ResultadoDeLectura) => {
    if (!tandaRef.current.silencio) sonar(resultado.tono);
  }, []);

  const drenar = React.useCallback(async () => {
    if (drenandoRef.current) return;
    drenandoRef.current = true;
    try {
      for (;;) {
        const [siguiente] = enCola(tandaRef.current);
        if (!siguiente) break;
        let resultado: ResultadoDeLectura;
        try {
          resultado = resultadoDeRespuesta(
            siguiente,
            await procesarLecturaAction(pedidoDeLectura(siguiente))
          );
        } catch {
          // No hubo respuesta. La lectura queda con su mismo clientUuid
          // para reintentar: si el pedido llegó, el backend no lo duplica.
          resultado = resultadoSinRespuesta();
        }
        actualizar((t) => conResultado(t, siguiente.id, resultado));
        setUltimoId(siguiente.id);
        avisar(resultado);
      }
    } finally {
      drenandoRef.current = false;
    }
  }, [actualizar, avisar]);

  // Lo que quedó en cola al recargar la página se manda al volver.
  React.useEffect(() => {
    queueMicrotask(() => {
      void drenar();
    });
  }, [drenar]);

  // Una lectura del lector, del teclado o de la cámara. Devuelve false si
  // no se encoló: el modo necesita un valor y todavía no se eligió. Un
  // rebote del lector (la misma lectura repetida enseguida) se descarta en
  // silencio y no cuenta como un error.
  const leer = React.useCallback(
    (texto: string): boolean => {
      const limpio = texto.trim();
      const modo = tandaRef.current.modo;
      if (!limpio) return true;
      if (!modo || !modoListo(modo)) {
        if (!tandaRef.current.silencio) sonar("error");
        return false;
      }
      if (esRebote(tandaRef.current, limpio)) return true;
      const lectura = nuevaLectura(limpio, modo, !recibe, nuevoClientUuid());
      actualizar((t) => conLectura(t, lectura));
      void drenar();
      return true;
    },
    [actualizar, drenar, recibe]
  );

  const cambiarModo = React.useCallback(
    (modo: Modo) => {
      if (!modosDisponibles(permisos).includes(modo.tipo)) return;
      actualizar((t) => ({ ...t, modo }));
    },
    [actualizar, permisos]
  );

  const reintentar = React.useCallback(
    (id: string) => {
      actualizar((t) => otraVezEnCola(t, id));
      void drenar();
    },
    [actualizar, drenar]
  );

  // Deshacer la asignación de una lectura: vuelve al sector o al recorrido
  // anterior con POST /custodia/asignaciones (no recibe: si el paquete
  // cambió de manos mientras tanto, el backend lo rechaza en vez de
  // tomarlo de nuevo). Devuelve el motivo si no se pudo.
  const deshacer = React.useCallback(
    async (lectura: Lectura): Promise<string | null> => {
      const asignacion = asignacionParaDeshacer(lectura);
      const envio = lectura.resultado?.envio;
      if (!asignacion || !envio) return "No hay nada para deshacer.";
      setDeshaciendoId(lectura.id);
      try {
        const r = await procesarLecturaAction({
          envioNumero: envio.numero,
          clientUuid: nuevoClientUuid(),
          occurredAt: new Date().toISOString(),
          asignacion,
          soloAsignar: true,
        });
        if (!r.ok) {
          if (!tandaRef.current.silencio) sonar("error");
          return r.message || r.title;
        }
        actualizar((t) => conDeshecha(t, lectura.id));
        if (!tandaRef.current.silencio) sonar("correcto");
        return null;
      } catch {
        if (!tandaRef.current.silencio) sonar("error");
        return "No se pudo comunicar con el servidor.";
      } finally {
        setDeshaciendoId(null);
      }
    },
    [actualizar]
  );

  const nuevaTanda = React.useCallback(() => {
    actualizar((t) => ({ ...tandaVacia(permisos), silencio: t.silencio }));
    setUltimoId(null);
  }, [actualizar, permisos]);

  const alternarSilencio = React.useCallback(() => {
    actualizar((t) => ({ ...t, silencio: !t.silencio }));
  }, [actualizar]);

  // El último resultado: la lectura que terminó más recientemente en esta
  // visita; tras una recarga, la más nueva que tenga resultado.
  const ultima =
    tanda.lecturas.find((l) => l.id === ultimoId && l.resultado) ??
    tanda.lecturas.find((l) => l.resultado) ??
    null;

  return {
    tanda,
    recibe,
    ultima,
    deshaciendoId,
    leer,
    cambiarModo,
    reintentar,
    deshacer,
    nuevaTanda,
    alternarSilencio,
  };
}
