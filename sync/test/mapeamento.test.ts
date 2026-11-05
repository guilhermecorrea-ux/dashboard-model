import { describe, expect, it } from "vitest";
import { mapearPedido as shopify } from "../src/conectores/shopify";
import { mapearPedido as bling } from "../src/conectores/bling";
import { mapearLinha } from "../src/conectores/windsor";
import { mapearRelatorio } from "../src/conectores/ga4";
import { anonimo, dataBR } from "../src/lib/util";

const money = (v: string) => ({ shopMoney: { amount: v } });

describe("Shopify", () => {
  const base = {
    id: "gid://shopify/Order/5551",
    processedAt: "2026-11-04T02:30:00Z", // 23h30 de 03/11 em São Paulo
    displayFinancialStatus: "PARTIALLY_REFUNDED",
    discountCodes: ["VOLTA15"],
    totalDiscountsSet: money("27.00"),
    totalShippingPriceSet: money("18.90"),
    totalRefundedSet: money("49.90"),
    customer: { id: "gid://shopify/Customer/77" },
    shippingAddress: { provinceCode: "sp" },
    customerJourneySummary: { firstVisit: { source: "google", utmParameters: { source: "instagram" } } },
    fulfillments: [{ createdAt: "2026-11-05T14:30:00Z" }],
    lineItems: { nodes: [{ sku: "VN-MIX500", quantity: 2, originalUnitPriceSet: money("89.90") }, { sku: null, quantity: 1, originalUnitPriceSet: money("10.00") }] },
  };
  it("converte valores, data no fuso de São Paulo e itens", () => {
    const p = shopify(base, "sal");
    expect(p.id).toBe("shopify:5551");
    expect(p.data).toBe("2026-11-03");
    expect(p.valor_bruto).toBe(189.8);
    expect(p.desconto).toBe(27);
    expect(p.reembolso).toBe(49.9);
    expect(p.uf).toBe("SP");
    expect(p.cupom).toBe("VOLTA15");
    expect(p.origem).toBe("instagram");
    expect(p.itens[1].sku).toBe("sem-sku");
    expect(p.dias_preparacao).toBe(1.5);
  });
  it("não guarda o id real do cliente", () => {
    const p = shopify(base, "sal");
    expect(p.cliente_id).not.toContain("Customer");
    expect(p.cliente_id).toMatch(/^[0-9a-f]{24}$/);
    expect(p.cliente_id).toBe(anonimo("gid://shopify/Customer/77", "sal"));
  });
  it("aceita pedido sem cliente, endereço ou despacho", () => {
    const p = shopify({ ...base, customer: null, shippingAddress: null, fulfillments: [], customerJourneySummary: null }, "s");
    expect(p.cliente_id).toBeNull();
    expect(p.uf).toBeNull();
    expect(p.dias_preparacao).toBeNull();
    expect(p.origem).toBeNull();
  });
});

describe("Bling", () => {
  const pedido = {
    id: 9001, data: "2026-11-02", loja: { id: 204 },
    contato: { id: 55, nome: "Empório Verde Ltda", tipoPessoa: "J" },
    situacao: { id: 9, valor: 1 }, desconto: { valor: 10 },
    itens: [{ codigo: "VN-CPA250", quantidade: 24, valor: 35.9 }],
    transporte: { frete: 0, etiqueta: { uf: "mg" } }, vendedor: { id: 3 },
    parcelas: [{ dataVencimento: "2026-12-14" }],
  };
  it("converte pedido B2B com razão social, prazo e vendedor", () => {
    const p = bling(pedido, "sal", { 3: "Carla Mendes" });
    expect(p.id).toBe("bling:9001");
    expect(p.loja_id).toBe("204");
    expect(p.valor_bruto).toBe(861.6);
    expect(p.cliente_nome).toBe("Empório Verde Ltda");
    expect(p.vendedor).toBe("Carla Mendes");
    expect(p.prazo_recebimento_dias).toBe(42);
    expect(p.uf).toBe("MG");
  });
  it("não guarda nome de pessoa física", () => {
    const p = bling({ ...pedido, contato: { id: 1, nome: "Maria da Silva", tipoPessoa: "F" } }, "sal");
    expect(p.cliente_nome).toBeNull();
  });
});

describe("Windsor e GA4", () => {
  it("lê a linha do Meta pelos nomes de campo configurados", () => {
    const l = mapearLinha({ date: "2026-11-03", campaign: "Remarketing", spend: "120.5", action_values_purchase: "600", actions_purchase: "3" });
    expect(l).toMatchObject({ data: "2026-11-03", plataforma: "meta", campanha: "Remarketing", investimento: 120.5, receita_atribuida: 600, conversoes: 3 });
  });
  it("agrupa canais do GA4 nas origens do dashboard", () => {
    const r = mapearRelatorio([
      { dimensionValues: [{ value: "20261103" }, { value: "Paid Social" }, { value: "mobile" }], metricValues: [{ value: "100" }, { value: "8" }, { value: "4" }, { value: "2" }] },
      { dimensionValues: [{ value: "20261103" }, { value: "Paid Search" }, { value: "tablet" }], metricValues: [{ value: "50" }, { value: "4" }, { value: "2" }, { value: "1" }] },
      { dimensionValues: [{ value: "20261103" }, { value: "Direct" }, { value: "desktop" }], metricValues: [{ value: "30" }, { value: "3" }, { value: "1" }, { value: "1" }] },
    ]);
    expect(r).toHaveLength(2);
    expect(r.find((x) => x.origem === "Pago")).toMatchObject({ data: "2026-11-03", dispositivo: "Celular", sessoes: 150, compras: 3 });
  });
});

describe("datas", () => {
  it("usa o fuso de São Paulo", () => expect(dataBR("2026-11-05T02:59:00Z")).toBe("2026-11-04"));
});
