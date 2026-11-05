// Escolhe a origem dos dados. Em desenvolvimento: cenário simulado.
// Em produção (fase 1 do plano): leitura das tabelas do Supabase da empresa.

import { gerarDataset } from "./mock/generate";
import type { DataProvider, Dataset, LojaCanal, Meta } from "./types";
import { supabaseProvider } from "./supabase";

const KEY_METAS = "bmb.metas.v1";
const KEY_LOJAS = "bmb.lojas.v1";

function ler<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function gravar(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* armazenamento indisponível: segue só em memória */
  }
}

/** Dados simulados; metas e classificação de lojas ficam salvas no navegador. */
export const mockProvider: DataProvider = {
  async load(): Promise<Dataset> {
    const ds = gerarDataset();
    const metas = ler<Meta[]>(KEY_METAS);
    const lojas = ler<LojaCanal[]>(KEY_LOJAS);
    return { ...ds, metas: metas ?? ds.metas, lojas: lojas ?? ds.lojas };
  },
  async saveMetas(metas) {
    gravar(KEY_METAS, metas);
  },
  async saveLojas(lojas) {
    gravar(KEY_LOJAS, lojas);
  },
};

export const MODO_DADOS: "simulado" | "supabase" =
  import.meta.env.VITE_DATA_SOURCE === "supabase" ? "supabase" : "simulado";

export function getProvider(): DataProvider {
  return MODO_DADOS === "supabase" ? supabaseProvider : mockProvider;
}
