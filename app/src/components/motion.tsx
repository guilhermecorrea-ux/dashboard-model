// Movimento: números que contam até o valor, entrada em cascata e respeito a "reduzir movimento".

import { useEffect, useRef, useState } from "react";

export const reduzMovimento = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Anima de valor anterior até o novo (troca de filtro também anima). */
export function useCountUp(alvo: number, duracao = 1100) {
  const [v, setV] = useState(reduzMovimento() ? alvo : 0);
  const de = useRef(reduzMovimento() ? alvo : 0);
  useEffect(() => {
    if (reduzMovimento() || !Number.isFinite(alvo)) { setV(alvo); de.current = alvo; return; }
    const inicio = de.current;
    const t0 = performance.now();
    let raf = 0;
    const passo = (t: number) => {
      const k = easeOutExpo(Math.min(1, (t - t0) / duracao));
      const atual = inicio + (alvo - inicio) * k;
      setV(atual);
      de.current = atual;
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, duracao]);
  return v;
}

export function Num({ valor, formato, className }: { valor: number; formato: (n: number) => string; className?: string }) {
  const v = useCountUp(valor);
  return <span className={`num ${className ?? ""}`}>{formato(v)}</span>;
}

/** Liga depois do primeiro quadro: usado para barras crescerem a partir de zero. */
export function useMontado(atraso = 60) {
  const [ok, setOk] = useState(reduzMovimento());
  useEffect(() => {
    const t = setTimeout(() => setOk(true), atraso);
    return () => clearTimeout(t);
  }, [atraso]);
  return ok;
}
