import { afterEach, describe, expect, it, vi } from "vitest";
import { TONOS, sonar } from "./sonidos";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("los tres sonidos", () => {
  it("se distinguen por altura y por ritmo", () => {
    // Correcto: un pitido, el más agudo. Aviso: dos. Error: uno, grave y largo.
    expect(TONOS.correcto).toHaveLength(1);
    expect(TONOS.aviso).toHaveLength(2);
    expect(TONOS.error).toHaveLength(1);
    expect(TONOS.correcto[0].frecuencia).toBeGreaterThan(TONOS.aviso[0].frecuencia);
    expect(TONOS.aviso[0].frecuencia).toBeGreaterThan(TONOS.error[0].frecuencia);
    expect(TONOS.error[0].duracion).toBeGreaterThan(TONOS.correcto[0].duracion * 2);
  });

  it("sin Web Audio en el navegador no lanza", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(() => sonar("correcto")).not.toThrow();
  });

  it("arma un oscilador por tono, con la frecuencia de cada sonido", () => {
    const osciladores: { frecuencia: number; start: number; stop: number }[] = [];
    class ContextoDeMentira {
      state = "running";
      currentTime = 10;
      destination = {};
      createOscillator() {
        const registro = { frecuencia: 0, start: 0, stop: 0 };
        osciladores.push(registro);
        return {
          type: "sine",
          frequency: {
            set value(v: number) {
              registro.frecuencia = v;
            },
          },
          connect: vi.fn(),
          start: (t: number) => (registro.start = t),
          stop: (t: number) => (registro.stop = t),
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
        };
      }
    }
    vi.stubGlobal("AudioContext", ContextoDeMentira);

    sonar("aviso");
    expect(osciladores.map((o) => o.frecuencia)).toEqual([660, 660]);
    // El segundo pitido empieza después de que termina el primero.
    expect(osciladores[1].start).toBeGreaterThan(osciladores[0].stop);

    osciladores.length = 0;
    sonar("error");
    expect(osciladores.map((o) => o.frecuencia)).toEqual([160]);
  });

  it("si el audio falla al sonar, tampoco lanza", () => {
    class ContextoRoto {
      state = "running";
      currentTime = 0;
      createOscillator() {
        throw new Error("sin audio");
      }
    }
    vi.stubGlobal("AudioContext", ContextoRoto);
    expect(() => sonar("error")).not.toThrow();
  });
});
