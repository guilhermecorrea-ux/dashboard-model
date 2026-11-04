// Formato padrão de dados. É o contrato entre os conectores (robô) e o dashboard:
// o painel só lê estas estruturas, nunca a fonte direto. Espelha as tabelas do Supabase.

export type Fonte = "shopify" | "bling" | "meta" | "google_ads" | "ga4";
export type Area = "DTC" | "B2B";
export type ClasseLoja = "site" | "marketplace" | "b2b" | "nao_classificada";

/** Loja/canal configurado no Bling e sua classificação (tabela lojas_canais). */
export interface LojaCanal {
  id: string;
  nome: string; // nome como está no Bling
  classe: ClasseLoja;
  /** Loja do Bling que espelha o site: excluída da receita do Bling (o site vem da Shopify). */
  espelhaSite?: boolean;
}

export interface ItemPedido {
  sku: string;
  qtd: number;
  precoUnit: number; // R$
}

/** Pedido de venda. Site vem da Shopify (somente pagos); demais canais do Bling. */
export interface Pedido {
  id: string;
  fonte: "shopify" | "bling";
  lojaId: string; // site = "shopify"; demais = LojaCanal.id
  data: string; // AAAA-MM-DD (data do pagamento/emissão)
  uf: string; // UF de entrega, sem dados pessoais
  clienteId: string; // identificador anônimo
  clienteNovo: boolean;
  valorBruto: number;
  desconto: number;
  frete: number;
  reembolso: number;
  cupom?: string;
  origem?: string; // UTM source (site)
  itens: ItemPedido[];
  diasPreparacao?: number; // pedido -> despacho
  vendedor?: string; // B2B
  clienteNome?: string; // razão social, apenas B2B
  prazoRecebimentoDias?: number; // B2B
}

export interface Produto {
  sku: string;
  nome: string;
  custo: number; // custo unitário (Bling)
  preco: number; // preço de tabela
  categoria: string;
}

export interface Estoque {
  sku: string;
  deposito: string;
  quantidade: number;
  ultimaVenda: string; // AAAA-MM-DD
}

export interface MidiaDiaria {
  data: string;
  plataforma: "meta" | "google_ads";
  campanha: string;
  investimento: number;
  receitaAtribuida: number; // informado pela plataforma
  conversoes: number;
}

export interface TrafegoDiario {
  data: string;
  origem: "Orgânico" | "Pago" | "Direto" | "Redes sociais" | "E-mail";
  dispositivo: "Celular" | "Computador";
  sessoes: number;
  carrinho: number;
  checkout: number;
  compras: number;
}

export interface LancamentoFinanceiro {
  id: string;
  tipo: "pagar" | "receber";
  categoria: string;
  descricao: string;
  valor: number;
  vencimento: string;
  pagoEm?: string;
  fixa: boolean; // despesa fixa (para EBITDA e ponto de equilíbrio)
}

export interface Meta {
  ano: number;
  mes: number; // 1-12
  area: Area;
  valor: number;
}

export interface SyncStatus {
  fonte: Fonte;
  ultimaExecucao: string; // ISO
  ok: boolean;
  dadosAte: string; // AAAA-MM-DD
}

export interface Dataset {
  empresa: string;
  hoje: string; // AAAA-MM-DD
  inicioHistorico: string;
  lojas: LojaCanal[];
  produtos: Produto[];
  pedidos: Pedido[];
  estoque: Estoque[];
  midia: MidiaDiaria[];
  trafego: TrafegoDiario[];
  financeiro: LancamentoFinanceiro[];
  metas: Meta[];
  sync: SyncStatus[];
  aliquotaImpostos: number; // % médio sobre a receita (das notas fiscais)
}

/** Origem dos dados: simulada (desenvolvimento) ou Supabase da empresa (produção). */
export interface DataProvider {
  load(): Promise<Dataset>;
  saveMetas(metas: Meta[]): Promise<void>;
  saveLojas(lojas: LojaCanal[]): Promise<void>;
}
