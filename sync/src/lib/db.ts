// Gravação no Supabase da empresa pela API REST (PostgREST), com a chave service_role.
import { exigir } from "./env";
import { buscar, json } from "./util";

const base = () => exigir("SUPABASE_URL").replace(/\/$/, "");
const cab = () => {
  const k = exigir("SUPABASE_SERVICE_KEY");
  return { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" };
};

/** Insere ou atualiza linhas em lotes de 500. */
export async function gravar(tabela: string, linhas: Record<string, unknown>[], chave: string): Promise<number> {
  for (let i = 0; i < linhas.length; i += 500) {
    const lote = linhas.slice(i, i + 500);
    const r = await buscar(`${base()}/rest/v1/${tabela}?on_conflict=${chave}`, {
      method: "POST",
      headers: { ...cab(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(lote),
    });
    if (!r.ok) throw new Error(`gravar ${tabela}: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
  }
  return linhas.length;
}

/** Apaga linhas que casam com o filtro PostgREST (ex.: "pedido_id=in.(a,b)"). */
export async function apagar(tabela: string, filtro: string): Promise<void> {
  const r = await buscar(`${base()}/rest/v1/${tabela}?${filtro}`, { method: "DELETE", headers: cab() });
  if (!r.ok) throw new Error(`apagar ${tabela}: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
}

export async function ler<T>(tabela: string, query = "select=*"): Promise<T[]> {
  return json<T[]>(await buscar(`${base()}/rest/v1/${tabela}?${query}`, { headers: cab() }), `ler ${tabela}`);
}

export async function rpc<T>(funcao: string, args: Record<string, unknown>): Promise<T> {
  const r = await buscar(`${base()}/rest/v1/rpc/${funcao}`, { method: "POST", headers: cab(), body: JSON.stringify(args) });
  return json<T>(r, `rpc ${funcao}`);
}

export const lerCredencial = <T>(fonte: string) => rpc<T | null>("ler_credencial", { p_fonte: fonte });
export const gravarCredencial = (fonte: string, dados: unknown) => rpc<null>("gravar_credencial", { p_fonte: fonte, p_dados: dados });

/** Grava pedidos e substitui os itens deles (o item pode mudar entre sincronizações). */
export async function gravarPedidos(pedidos: (Record<string, unknown> & { id: string; itens: Record<string, unknown>[] })[]) {
  const cabecalhos = pedidos.map(({ itens: _i, ...p }) => ({ ...p, atualizado_em: new Date().toISOString() }));
  await gravar("pedidos", cabecalhos, "id");
  for (let i = 0; i < pedidos.length; i += 200) {
    const lote = pedidos.slice(i, i + 200);
    await apagar("itens_pedido", `pedido_id=in.(${lote.map((p) => `"${p.id.replace(/"/g, "")}"`).join(",")})`);
    const itens = lote.flatMap((p) => p.itens.map((it, k) => ({ pedido_id: p.id, linha: k + 1, ...it })));
    if (itens.length) await gravar("itens_pedido", itens, "pedido_id,linha");
  }
  return pedidos.length;
}

export async function registrar(fonte: string, modo: string, inicio: Date, ok: boolean, linhas: number, dadosAte: string | null, erro?: string) {
  await gravar("sync_log", [{ fonte, modo, inicio: inicio.toISOString(), fim: new Date().toISOString(), ok, linhas, dados_ate: dadosAte, erro: erro?.slice(0, 2000) ?? null }], "id").catch(() => {});
}
