import { useMemo, useState } from "react";
import { useApp } from "../state/app";
import { FaceHeader } from "../components/shell";
import { AlertBanner, Panel } from "../components/ui";
import { MESES } from "../lib/dates";
import { brl, num } from "../lib/format";
import type { Area, Meta } from "../data/types";

const AREAS: Area[] = ["DTC", "B2B"];

/** Tela de Metas: planejado mês a mês por área, inclusive anos anteriores. */
export function Metas() {
  const { ds, salvarMetas } = useApp();
  const anoAtual = Number(ds.hoje.slice(0, 4));
  const [ano, setAno] = useState(anoAtual);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);
  const valorDe = (m: number, a: Area) => ds.metas.find((x) => x.ano === ano && x.mes === m && x.area === a)?.valor ?? 0;
  const chave = (m: number, a: Area) => `${ano}-${m}-${a}`;
  const atual = (m: number, a: Area) => {
    const r = rascunho[chave(m, a)];
    return r !== undefined ? Number(r.replace(/\D/g, "")) || 0 : valorDe(m, a);
  };
  const alterado = Object.keys(rascunho).some((k) => k.startsWith(`${ano}-`));
  const totais = useMemo(() => AREAS.map((a) => Array.from({ length: 12 }, (_, i) => atual(i + 1, a)).reduce((s, x) => s + x, 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rascunho, ds.metas, ano]);

  const salvar = async () => {
    const novas: Meta[] = ds.metas.filter((x) => x.ano !== ano);
    for (let m = 1; m <= 12; m++) for (const a of AREAS) novas.push({ ano, mes: m, area: a, valor: atual(m, a) });
    await salvarMetas(novas);
    setRascunho({});
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  };

  return (
    <>
      <FaceHeader titulo="Metas" filtros={false} />
      <div className="bmb-pills" role="group" aria-label="Ano">
        {[anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1].map((y) => (
          <button key={y} className="bmb-pill" aria-pressed={y === ano} onClick={() => setAno(y)}>{y}</button>
        ))}
      </div>
      {salvo && <AlertBanner tom="info">Metas de {ano} salvas.</AlertBanner>}
      <Panel titulo={`Planejado de ${ano}`} acao={
        <div className="acoes-linha">
          {alterado && <button className="bmb-pill" onClick={() => setRascunho({})}>Descartar</button>}
          <button className="bmb-pill" aria-pressed="true" disabled={!alterado} onClick={salvar}>Salvar metas</button>
        </div>
      }>
        <div className="bmb-table-wrap">
          <table className="bmb-table metas">
            <thead>
              <tr><th>Área</th>{MESES.map((m) => <th key={m} className="r">{m}</th>)}<th className="r">Total</th></tr>
            </thead>
            <tbody>
              {AREAS.map((a, ai) => (
                <tr key={a}>
                  <td><b>{a}</b></td>
                  {MESES.map((_, i) => (
                    <td key={i} className="r">
                      <input id={`meta-${ano}-${a}-${i + 1}`} inputMode="numeric" aria-label={`Meta ${a} ${MESES[i]} ${ano}`}
                        value={rascunho[chave(i + 1, a)] ?? (valorDe(i + 1, a) ? num(valorDe(i + 1, a)) : "")}
                        placeholder="—"
                        onChange={(e) => setRascunho({ ...rascunho, [chave(i + 1, a)]: e.target.value })}
                        onBlur={(e) => { const v = Number(e.target.value.replace(/\D/g, "")); if (e.target.value) setRascunho({ ...rascunho, [chave(i + 1, a)]: v ? num(v) : "" }); }} />
                    </td>
                  ))}
                  <td className="r"><b>{brl(totais[ai])}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nota">Valores em reais por mês. O planejado de cada período do dashboard é proporcional aos dias do mês. Total do ano: {brl(totais[0] + totais[1])}.</p>
      </Panel>
    </>
  );
}
