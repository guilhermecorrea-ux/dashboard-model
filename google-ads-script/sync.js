/**
 * BMB Dashboard — Google Ads → Supabase da empresa.
 *
 * Onde colar: Google Ads da empresa → Ferramentas → Ações em massa → Scripts → + (novo script).
 * Autorize quando o Google pedir e agende: "Diariamente", 5h–6h.
 * O /instalar-empresa preenche as três constantes abaixo. Não precisa de token de desenvolvedor.
 */
var SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
var SUPABASE_ANON_KEY = "CHAVE-ANON-PUBLICA";
var TOKEN_ENTRADA = "TOKEN-GERADO-NA-INSTALACAO";
var DIAS = 7; // reprocessa a última semana para pegar conversões atrasadas

function main() {
  var hoje = new Date();
  var fim = formatar(adicionarDias(hoje, -1));
  var inicio = formatar(adicionarDias(hoje, -DIAS));
  var consulta =
    "SELECT segments.date, campaign.name, metrics.cost_micros, metrics.conversions, metrics.conversions_value " +
    "FROM campaign WHERE segments.date BETWEEN '" + inicio + "' AND '" + fim + "' AND metrics.impressions > 0";
  var linhas = [];
  var resultado = AdsApp.search(consulta);
  while (resultado.hasNext()) {
    var r = resultado.next();
    linhas.push({
      data: r.segments.date,
      campanha: r.campaign.name,
      investimento: Number(r.metrics.costMicros || 0) / 1e6,
      receita: Number(r.metrics.conversionsValue || 0),
      conversoes: Number(r.metrics.conversions || 0)
    });
  }
  var resposta = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/rpc/receber_google_ads", {
    method: "post",
    contentType: "application/json",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY },
    payload: JSON.stringify({ p_token: TOKEN_ENTRADA, p_linhas: linhas }),
    muteHttpExceptions: true
  });
  if (resposta.getResponseCode() >= 300) {
    throw new Error("Falha ao enviar ao dashboard: " + resposta.getResponseCode() + " " + resposta.getContentText());
  }
  Logger.log("Enviadas " + linhas.length + " linhas (" + inicio + " a " + fim + ").");
}

function adicionarDias(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
function formatar(d) {
  return Utilities.formatDate(d, AdsApp.currentAccount().getTimeZone(), "yyyy-MM-dd");
}
