"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PainelAnalise from "@/components/PainelAnalise";
import { ESTADOS, fmt } from "@/lib/apresentacao";

async function obter(url) {
  const r = await fetch(url, { cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro || "Não foi possível carregar.");
  return d;
}

// Resumo da concordância entre o sistema e a literatura, para o espectro aberto
function Concordancia({ especies }) {
  const rep = especies.filter((e) => ["concorda", "concorda_parcial", "consistente", "falhou", "fora_do_alcance"].includes(e.comparacao) && e.fonte);
  const extra = especies.filter((e) => e.comparacao === "nao_reportada");
  if (!rep.length && !extra.length) return null;
  const linha = (e) => (
    <li key={e.id}>
      <strong>{e.nome}</strong>: {e.fonte ? `reportada (${e.fonte})` : "não reportada"}; neste espectro, {ESTADOS[e.estado].toLowerCase()}.
    </li>
  );
  const acertos = rep.filter((e) => e.comparacao === "concorda").length;
  const parciais = rep.filter((e) => ["concorda_parcial", "consistente"].includes(e.comparacao)).length;
  const avaliaveis = rep.filter((e) => e.comparacao !== "fora_do_alcance").length;
  return (
    <section className="painel" style={{ marginTop: "1.1rem" }} aria-labelledby="titulo-conc">
      <h2 id="titulo-conc">Sistema e literatura</h2>
      <p className="nota">
        Das espécies reportadas que este espectro cobre, o sistema deteta {acertos} de {avaliaveis}
        {parciais > 0 && ` e encontra sinal mais fraco (tentativa ou indício) em ${parciais}`}.
        {extra.length > 0 && ` Assinala ${extra.length} ${extra.length === 1 ? "espécie" : "espécies"} que os artigos não reportam.`}
        {" "}Os artigos podem combinar vários instrumentos: uma espécie reportada pode não ter sinal neste espectro em particular.
      </p>
      <ul className="motivos" style={{ marginTop: 0 }}>
        {rep.map(linha)}
        {extra.map(linha)}
      </ul>
    </section>
  );
}

export default function Planeta() {
  const { id } = useParams();
  const [dados, setDados] = useState(null);
  const [base, setBase] = useState(null);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(null);       // resultado da análise
  const [aAbrir, setAAbrir] = useState(null);       // hash em carregamento
  const [especie, setEspecie] = useState("");
  const [fonte, setFonte] = useState("");
  const [erroForm, setErroForm] = useState("");

  const carregar = useCallback(() => {
    Promise.all([obter(`/api/planetas/${encodeURIComponent(id)}`), obter("/api/base")])
      .then(([p, b]) => { setDados(p); setBase(b); })
      .catch((e) => setErro(e.message));
  }, [id]);
  useEffect(carregar, [carregar]);

  async function abrir(o) {
    setAAbrir(o.hash); setErro("");
    try {
      const r = await obter(`/api/espectros/${o.hash}?ficheiro=${encodeURIComponent(o.ficheiro)}`);
      setAberto(r);
      requestAnimationFrame(() => document.getElementById("analise-aberta")?.scrollIntoView({ behavior: "smooth" }));
    } catch (e) {
      setErro(e.message);
    } finally {
      setAAbrir(null);
    }
  }

  async function registar(e) {
    e.preventDefault();
    if (!especie || !fonte.trim()) { setErroForm("Escolhe a espécie e indica o artigo."); return; }
    try {
      const r = await fetch("/api/reportadas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planeta: dados.planeta.id, especie, fonte }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro || "Não foi possível registar.");
      setEspecie(""); setFonte(""); setErroForm("");
      carregar();
      if (aberto) abrir({ hash: aberto.hash, ficheiro: aberto.ficheiro });
    } catch (err) { setErroForm(err.message); }
  }

  if (erro && !dados) return <main><p className="falha" role="alert">{erro}</p><p><Link href="/base">Voltar à base de conhecimento</Link></p></main>;
  if (!dados) return <main><p className="nota">A carregar o planeta…</p></main>;

  const p = dados.planeta;
  return (
    <main>
      <section className="painel" aria-labelledby="titulo-planeta">
        <div className="alvo">
          <div>
            <p className="alvo-rotulo"><Link href="/base">Base de conhecimento</Link></p>
            <h2 id="titulo-planeta" className="alvo-nome">{p.nome}</h2>
            <p className="alvo-rotulo" style={{ marginTop: "1rem" }}>Espécies reportadas na literatura</p>
            {dados.reportadas.length ? (
              <ul className="motivos" style={{ marginTop: "0.3rem" }}>
                {dados.reportadas.map((r) => <li key={r.especie + r.fonte}><strong style={{ color: "var(--texto)" }}>{r.nome}</strong>, {r.fonte}</li>)}
              </ul>
            ) : (
              <p className="nota" style={{ marginTop: "0.3rem" }}>Nenhuma espécie reportada registada para este planeta.</p>
            )}
            <form onSubmit={registar} noValidate className="campos" style={{ marginBottom: 0 }}>
              <label className="campo">Espécie
                <select value={especie} onChange={(e) => { setEspecie(e.target.value); setErroForm(""); }}>
                  <option value="">Escolher…</option>
                  {(base?.especies ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </label>
              <label className="campo">Artigo
                <input value={fonte} onChange={(e) => { setFonte(e.target.value); setErroForm(""); }} placeholder="Autor et al. 2026" />
              </label>
              <p className="largo" style={{ margin: 0 }}><button className="botao secundario">Registar espécie reportada</button></p>
              {erroForm && <p className="falha largo" role="alert" style={{ margin: 0 }}>{erroForm}</p>}
            </form>
          </div>
          <div>
            <dl className="ficha">
              <dt>R★</dt><dd>{fmt(p.rs)} ± {fmt(p.ers)} R☉</dd>
              <dt>Rp</dt><dd>{fmt(p.rp)} ± {fmt(p.erp)} R♃</dd>
              <dt>Ref. estelar</dt><dd>{p.ref || "—"}</dd>
              <dt>Espectros</dt><dd>{dados.observacoes.length}</dd>
            </dl>
          </div>
        </div>
      </section>

      <section className="painel" style={{ marginTop: "1.1rem" }} aria-labelledby="titulo-obs">
        <h2 id="titulo-obs">Espectros registados</h2>
        {dados.observacoes.length === 0 ? (
          <p className="nota" style={{ margin: 0 }}>Ainda não há espectros deste planeta. Carrega um na página <Link href="/">Analisar</Link>.</p>
        ) : (
          <div className="tabela-scroll">
            <table className="dados">
              <thead><tr><th>Ficheiro</th><th>Autores</th><th>Cobertura</th><th></th></tr></thead>
              <tbody>
                {dados.observacoes.map((o) => (
                  <tr key={o.hash}>
                    <td style={{ overflowWrap: "anywhere" }}>{o.ficheiro || o.hash.slice(0, 12)}</td>
                    <td>{o.autores || "—"}</td>
                    <td>{fmt(o.lmin, 2)}–{fmt(o.lmax, 2)} µm</td>
                    <td style={{ textAlign: "right" }}>
                      {o.guardado ? (
                        <button className="botao secundario" onClick={() => abrir(o)} disabled={aAbrir === o.hash}
                          aria-pressed={aberto?.hash === o.hash}>
                          {aAbrir === o.hash ? "A abrir…" : aberto?.hash === o.hash ? "Aberto" : "Abrir análise"}
                        </button>
                      ) : (
                        <span className="nota" style={{ margin: 0 }}>Ficheiro não guardado: carrega-o de novo em Analisar</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {erro && <p className="falha" role="alert">{erro}</p>}
      </section>

      {aberto && (
        <div id="analise-aberta">
          <Concordancia especies={aberto.especies} />
          <PainelAnalise resultado={aberto} especies={aberto.especies} especiesBase={base?.especies ?? []} />
        </div>
      )}
    </main>
  );
}
