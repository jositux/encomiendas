// Tres sonidos para trabajar sin mirar la pantalla (Recepción, 2026-10-02):
// correcto, aviso y error. Son tonos generados con Web Audio -- no hay
// archivos de audio en el proyecto. Se distinguen por altura Y por ritmo,
// para que se reconozcan también con el parlante chico de un celular:
//   correcto: un pitido agudo y corto.
//   aviso:    dos pitidos medios.
//   error:    un zumbido grave y largo.
export type Sonido = "correcto" | "aviso" | "error";

interface Tono {
  frecuencia: number;
  forma: OscillatorType;
  // Segundos desde el inicio del sonido.
  desde: number;
  duracion: number;
}

export const TONOS: Record<Sonido, Tono[]> = {
  correcto: [{ frecuencia: 1320, forma: "sine", desde: 0, duracion: 0.12 }],
  aviso: [
    { frecuencia: 660, forma: "triangle", desde: 0, duracion: 0.13 },
    { frecuencia: 660, forma: "triangle", desde: 0.2, duracion: 0.13 },
  ],
  error: [{ frecuencia: 160, forma: "square", desde: 0, duracion: 0.45 }],
};

let contexto: AudioContext | null = null;

function obtenerContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Constructor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) return null;
  contexto ??= new Constructor();
  return contexto;
}

// Nunca lanza: un navegador sin audio, o que todavía no lo habilitó porque
// no hubo ningún gesto del usuario, no puede romper un escaneo.
export function sonar(sonido: Sonido): void {
  try {
    const ctx = obtenerContexto();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const inicio = ctx.currentTime;
    for (const tono of TONOS[sonido]) {
      const oscilador = ctx.createOscillator();
      const volumen = ctx.createGain();
      oscilador.type = tono.forma;
      oscilador.frequency.value = tono.frecuencia;
      // Entrada y salida suaves, para que no haga "clic".
      const t0 = inicio + tono.desde;
      const t1 = t0 + tono.duracion;
      volumen.gain.setValueAtTime(0.0001, t0);
      volumen.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01);
      volumen.gain.exponentialRampToValueAtTime(0.0001, t1);
      oscilador.connect(volumen);
      volumen.connect(ctx.destination);
      oscilador.start(t0);
      oscilador.stop(t1 + 0.02);
    }
  } catch {
    // Sin sonido: la pantalla sigue mostrando el resultado con su color.
  }
}
