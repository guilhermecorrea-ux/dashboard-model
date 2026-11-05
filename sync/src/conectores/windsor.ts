// Meta Ads pela conta Windsor (plano free) da empresa. Atualiza 1x por dia: dados até ontem.
// ⚠️ VALIDAR na instalação os nomes dos campos (o Windsor mostra em get_fields / na tela do conector).
import { exigir, opcional } from "../lib/env";
import { buscar, json, num } from "../lib/util";

export const CAMPOS_PADRAO = "date,campaign,spend,action_values_purchase,actions_purchase";

export function mapearLinha(l: Record<string, unknown>, campos = CAMPOS_PADRAO.split(",")) {
  const [, , gasto, receita, conversoes] = campos;
  return {
    data: String(l[campos[0]]).slice(0, 10),
    plataforma: "meta",
    campanha: String(l[campos[1]] ?? "Sem campanha"),
    investimento: num(l[gasto]),
    receita_atribuida: num(l[receita]),
    conversoes: num(l[conversoes]),
  };
}

export async function buscarMidia(desde: string, ate: string) {
  const campos = (opcional("WINDSOR_CAMPOS") ?? CAMPOS_PADRAO).split(",");
  const url = `https://connectors.windsor.ai/facebook?api_key=${encodeURIComponent(exigir("WINDSOR_API_KEY"))}` +
    `&date_from=${desde}&date_to=${ate}&fields=${campos.join(",")}`;
  const body = await json<{ data?: Record<string, unknown>[] } | Record<string, unknown>[]>(await buscar(url), "Windsor");
  const linhas = Array.isArray(body) ? body : body.data ?? [];
  // Soma linhas repetidas (mesma data e campanha em contas/conjuntos diferentes)
  const acc = new Map<string, ReturnType<typeof mapearLinha>>();
  for (const l of linhas.map((x) => mapearLinha(x, campos))) {
    const k = `${l.data}|${l.campanha}`;
    const a = acc.get(k);
    if (a) { a.investimento += l.investimento; a.receita_atribuida += l.receita_atribuida; a.conversoes += l.conversoes; }
    else acc.set(k, { ...l });
  }
  return [...acc.values()];
}
