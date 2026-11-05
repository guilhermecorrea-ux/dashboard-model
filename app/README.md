# BMB Dashboard — app

Site do dashboard (React + Vite + ECharts), com o visual de `../design-system`.

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em http://localhost:5173. Entre com qualquer e-mail e escolha o perfil da demonstração.

## Dados

- `src/data/types.ts`: formato padrão de dados (o contrato com os conectores).
- `src/data/mock/generate.ts`: cenário **simulado** da Vitanuts (12 meses). Nenhum número é real.
- `src/data/provider.ts`: escolhe a origem. `VITE_DATA_SOURCE=supabase` será ligado na fase 1 do plano.
- `src/metrics/`: todas as fórmulas de KPI (seguem `docs/KPIS.md`).

## Visual

`npm run tokens` gera `src/styles/tokens.css` a partir de `design-system/tokens.json`.
Os componentes usam as classes de `design-system/components/bundle.css`.

## Demonstração em um arquivo

`npm run demo` gera `dist/bmb-dashboard.html`, com tudo embutido (abre direto no navegador).
