import { addDays, daysInMonth, diffDays, fromISO, toISO } from "../lib/dates";

export type PeriodoTipo = "hoje" | "7d" | "mes" | "tri" | "ano" | "12m";
export type Comparacao = "anterior" | "ano_anterior";

export interface Intervalo {
  inicio: string;
  fim: string;
}

export const PERIODOS: { id: PeriodoTipo; rotulo: string }[] = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "7d", rotulo: "7 dias" },
  { id: "mes", rotulo: "Mês" },
  { id: "tri", rotulo: "Trimestre" },
  { id: "ano", rotulo: "Ano" },
  { id: "12m", rotulo: "12 meses" },
];

export const COMPARACOES: { id: Comparacao; rotulo: string }[] = [
  { id: "anterior", rotulo: "vs. período anterior" },
  { id: "ano_anterior", rotulo: "vs. ano anterior" },
];

export function intervalo(tipo: PeriodoTipo, hoje: string): Intervalo {
  const d = fromISO(hoje);
  switch (tipo) {
    case "hoje":
      return { inicio: hoje, fim: hoje };
    case "7d":
      return { inicio: addDays(hoje, -6), fim: hoje };
    case "mes":
      return { inicio: toISO(new Date(d.getFullYear(), d.getMonth(), 1)), fim: hoje };
    case "tri": {
      const q = Math.floor(d.getMonth() / 3) * 3;
      return { inicio: toISO(new Date(d.getFullYear(), q, 1)), fim: hoje };
    }
    case "ano":
      return { inicio: toISO(new Date(d.getFullYear(), 0, 1)), fim: hoje };
    case "12m":
      return { inicio: addDays(hoje, -364), fim: hoje };
  }
}

/** Intervalo de comparação, ou null quando o histórico não cobre (nunca mostramos 0% inventado). */
export function intervaloComparacao(i: Intervalo, tipo: PeriodoTipo, comp: Comparacao, inicioHistorico: string): Intervalo | null {
  let c: Intervalo;
  if (comp === "ano_anterior") {
    const shift = (s: string) => { const d = fromISO(s); d.setFullYear(d.getFullYear() - 1); return toISO(d); };
    c = { inicio: shift(i.inicio), fim: shift(i.fim) };
  } else if (tipo === "mes" || tipo === "tri" || tipo === "ano") {
    const meses = tipo === "mes" ? 1 : tipo === "tri" ? 3 : 12;
    const ini = fromISO(i.inicio); ini.setMonth(ini.getMonth() - meses);
    const fimD = fromISO(i.fim); fimD.setDate(1); fimD.setMonth(fimD.getMonth() - meses);
    const dia = Math.min(fromISO(i.fim).getDate(), daysInMonth(fimD.getFullYear(), fimD.getMonth() + 1));
    fimD.setDate(dia);
    c = { inicio: toISO(ini), fim: toISO(fimD) };
  } else {
    const n = diffDays(i.inicio, i.fim) + 1;
    c = { inicio: addDays(i.inicio, -n), fim: addDays(i.inicio, -1) };
  }
  return c.inicio < inicioHistorico ? null : c;
}

export const dentro = (data: string, i: Intervalo) => data >= i.inicio && data <= i.fim;

export function rotuloComparacao(c: Intervalo | null, comp: Comparacao): string {
  if (!c) return "sem comparação";
  return comp === "ano_anterior" ? "vs. ano anterior" : "vs. período anterior";
}
