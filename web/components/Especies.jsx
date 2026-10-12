"use client";
import ReguaSigma from "./ReguaSigma";
import { corDe, ESTADOS, COMPARACOES, fmtSigma, faixa } from "@/lib/apresentacao";

const ORDEM = { detetada: 0, tentativa: 1, indicio: 2, nao_detetada: 3, sem_cobertura: 4 };

export default function Especies({ especies, ordemBase, medidas, selecionada, onSelecionar, limiares, onExportar }) {
  const indice = (id) => Math.max(0, ordemBase.indexOf(id));
  const porBanda = Object.fromEntries(medidas.map((m) => [m.banda, m]));
  const temReferencia = especies.some((e) => e.comparacao !== "sem_referencia");
  const ordenadas = [...especies]
    .filter((e) => e.estado !== "sem_cobertura")
    .sort((a, b) => ORDEM[a.estado] - ORDEM[b.estado] || indice(a.id) - indice(b.id));
  const fora = especies.filter((e) => e.estado === "sem_cobertura");

  return (
    <section className="painel" aria-labelledby="titulo-esp">
      <div className="cabeca-painel">
        <h2 id="titulo-esp">Espécies químicas</h2>
        <button className="botao secundario" onClick={onExportar}>Exportar medidas (CSV)</button>
      </div>
      <p className="nota">
        Excesso de profundidade em cada banda face ao contínuo vizinho, em unidades de σ. Zonas da régua:
        indício a partir de {limiares?.indicio ?? 2}σ, tentativa a partir de {limiares?.fraca ?? 3}σ, deteção a partir de {limiares?.forte ?? 5}σ.
        {!temReferencia && " Regista as espécies reportadas nos artigos para comparar com a literatura."}
      </p>
      <div className="lista-especies">
        {ordenadas.map((e) => {
          // a comparação só interessa para espécies reportadas, ou detetadas sem estarem reportadas
          const relevante = e.fonte || e.comparacao === "nao_reportada";
          const [textoComp, classeComp] = relevante ? COMPARACOES[e.comparacao] ?? [null, ""] : [null, ""];
          return (
            <div key={e.id} className="especie">
              <div className="especie-topo">
                <span className="cor" style={{ background: corDe(indice(e.id)) }} aria-hidden="true" />
                <span className="nome">{e.nome}</span>
                <span className={`estado ${e.estado}`}>{ESTADOS[e.estado] ?? e.estado}</span>
              </div>
              <p className="especie-motivo">
                {e.motivo}
                {textoComp && <span className={`comparacao ${classeComp}`}>{textoComp}{e.fonte ? ` (${e.fonte})` : ""}</span>}
                {e.falta && e.estado !== "nao_detetada" && <span className="falta" style={{ display: "block" }}>{e.falta}</span>}
              </p>
              {e.alertas?.length > 0 && (
                <ul className="alertas" style={{ margin: "0 0 0.5rem 1.6rem" }}>{e.alertas.map((a) => <li key={a}>{a}</li>)}</ul>
              )}
              <div className="bandas">
                {e.bandas.map((b) => {
                  const m = porBanda[b.id];
                  const avaliada = m?.coberta && m.sigma !== null;
                  return (
                    <button key={b.id} type="button" className="linha-banda-btn"
                      aria-pressed={selecionada === b.id} onClick={() => onSelecionar(b.id)}>
                      <span className="faixa-txt">{faixa(b)}</span>
                      {avaliada ? <ReguaSigma sigma={m.sigma} forte={limiares?.forte} fraca={limiares?.fraca} indicio={limiares?.indicio} /> : <span style={{ fontSize: "0.8rem", color: "var(--texto-fraco)" }}>sem pontos suficientes</span>}
                      <span className={`valor ${avaliada ? "" : "vazio"}`}>{avaliada ? fmtSigma(m.sigma) : "—"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {fora.length > 0 && (
        <p className="nota" style={{ margin: "0.9rem 0 0", paddingTop: "0.8rem", borderTop: "1px solid var(--linha)" }}>
          Fora do espectro (nenhuma banda com pontos suficientes): {fora.map((e) => e.nome + (e.fonte ? ` (reportada: ${e.fonte})` : "")).join(", ")}.
        </p>
      )}
    </section>
  );
}
