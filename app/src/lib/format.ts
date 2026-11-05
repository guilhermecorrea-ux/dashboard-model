// Formatação no padrão do sistema visual: R$ 812 mil, R$ 1,24 mi, 46,2%, +1,4 p.p., 4,8×.

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max });

export const MINUS = "−";

const sign = (n: number) => (n > 0 ? "+" : n < 0 ? MINUS : "");

export function brl(v: number): string {
  const a = Math.abs(v);
  const s = v < 0 ? MINUS : "";
  if (a >= 1_000_000) return `${s}R$ ${nf(2, 2).format(a / 1_000_000)} mi`;
  if (a >= 100_000) return `${s}R$ ${nf(0, 0).format(a / 1000)} mil`;
  if (a >= 10_000) return `${s}R$ ${nf(1, 1).format(a / 1000)} mil`;
  return `${s}R$ ${nf(2, 2).format(a)}`;
}

export const brlExato = (v: number) =>
  `${v < 0 ? MINUS : ""}R$ ${nf(2, 2).format(Math.abs(v))}`;

export const num = (v: number, dec = 0) => nf(dec, dec).format(v);

export const pct = (v: number, dec = 1) => `${nf(dec, dec).format(v * 100)}%`;

export const mult = (v: number) => `${nf(1, 1).format(v)}×`;

export const dias = (v: number) => `${nf(1, 1).format(v)} dias`;

/** Variação relativa formatada com sinal: +12,4% */
export const deltaPct = (v: number) => `${sign(v)}${nf(1, 1).format(Math.abs(v) * 100)}%`;

/** Diferença entre percentuais: +1,4 p.p. */
export const deltaPP = (v: number) => `${sign(v)}${nf(1, 1).format(Math.abs(v) * 100)} p.p.`;

export const deltaAbs = (v: number, fmt: (n: number) => string) => `${sign(v)}${fmt(Math.abs(v))}`;
