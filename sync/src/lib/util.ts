import { createHash } from "node:crypto";

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Data AAAA-MM-DD no fuso de São Paulo (o dia do pedido para o negócio). */
export function dataBR(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export const hojeBR = () => dataBR(new Date().toISOString());

export function somarDias(d: string, n: number): string {
  const [y, m, dd] = d.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, dd + n));
  return x.toISOString().slice(0, 10);
}

export const diasEntre = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

/** Identificador anônimo de cliente: hash com sal, sem guardar o id original. */
export function anonimo(id: string | number | null | undefined, sal: string): string | null {
  if (id === null || id === undefined || id === "") return null;
  return createHash("sha256").update(`${sal}:${id}`).digest("hex").slice(0, 24);
}

export const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

/** fetch com novas tentativas para limites de uso (429) e falhas temporárias (5xx). */
export async function buscar(url: string, init: RequestInit = {}, tentativas = 5): Promise<Response> {
  for (let i = 0; ; i++) {
    const r = await fetch(url, init);
    if (r.ok || (r.status < 500 && r.status !== 429) || i >= tentativas - 1) return r;
    const espera = Number(r.headers.get("retry-after")) * 1000 || 1000 * 2 ** i;
    await esperar(espera);
  }
}

export async function json<T>(r: Response, contexto: string): Promise<T> {
  if (!r.ok) throw new Error(`${contexto}: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
  return (await r.json()) as T;
}
