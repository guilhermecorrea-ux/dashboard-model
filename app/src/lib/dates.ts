// Datas como texto AAAA-MM-DD, sempre em horário local de calendário (sem fuso).

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (s: string, n: number) => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const diffDays = (a: string, b: string) =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);

export const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

export const monthKey = (s: string) => s.slice(0, 7);

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export const fmtDia = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
export const fmtMes = (key: string) => `${MESES[Number(key.slice(5, 7)) - 1]}/${key.slice(2, 4)}`;
