import "server-only";

const API_BASE_URL = process.env.API_BASE_URL ?? "https://api.srv01.sebastianpaniagua.qzz.io";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly title: string,
    detail: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      payload?.code ?? "ERROR_DESCONOCIDO",
      payload?.title ?? "Error",
      payload?.detail ?? payload?.message ?? "Ocurrió un error al comunicarse con el servidor."
    );
  }

  return payload as T;
}

export function nuevoClientUuid(): string {
  return crypto.randomUUID();
}
