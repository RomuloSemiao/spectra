"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { corDe, fmt } from "@/lib/apresentacao";

async function enviar(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.erro || "Não foi possível guardar.");
  return d;
}

function NovaEspecie({ onCriada }) {
  const vazia = { lmin: "", lmax: "" };
  const [nome, setNome] = useState("");
  const [id, setId] = useState("");
  const [bandas, setBandas] = useState([vazia]);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  const mudaBanda = (i, k) => (e) => {
    setBandas(bandas.map((b, j) => (j === i ? { ...b, [k]: e.target.value } : b)));
    setErro("");
  };

  async function guardar(e) {
    e.preventDefault();
    setOk("");
    if (!nome.trim()) { setErro("Indica o nome da espécie."); return; }
    const bs = bandas.map((b) => ({ lmin: Number(b.lmin), lmax: Number(b.lmax) }));
    if (bs.some((b) => !(b.lmin > 0 && b.lmax > b.lmin))) { setErro("Cada banda precisa de λ mínimo > 0 e λ máximo maior que o mínimo."); return; }
    try {
      const d = await enviar("/api/especies", { nome, id, bandas: bs });
      setOk(`${nome} adicionada (id ${d.id}).`);
      setNome(""); setId(""); setBandas([vazia]);
      onCriada();
    } catch (err) { setErro(err.message); }
  }

  return (
    <form className="painel" onSubmit={guardar} noValidate>
      <h2>Nova espécie química</h2>
      <p className="nota">As janelas espectrais não vêm dos CSVs: tira-as da literatura ou de uma base como o HITRAN.</p>
      <div className="campos">
        <label className="campo">Nome<input value={nome} onChange={(e) => { setNome(e.target.value); setErro(""); }} placeholder="NH₃" /></label>
        <label className="campo">Id (opcional)<input value={id} onChange={(e) => setId(e.target.value)} placeholder="nh3" /></label>
      </div>
      {bandas.map((b, i) => (
        <div className="linha-banda" key={i}>
          <label className="campo">λ mínimo (µm)<input inputMode="decimal" value={b.lmin} onChange={mudaBanda(i, "lmin")} /></label>
          <label className="campo">λ máximo (µm)<input inputMode="decimal" value={b.lmax} onChange={mudaBanda(i, "lmax")} /></label>
          {bandas.length > 1 && (
            <button type="button" className="botao secundario" onClick={() => setBandas(bandas.filter((_, j) => j !== i))}>Remover</button>
          )}
        </div>
      ))}
      <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "0.75rem 0 0" }}>
        <button type="button" className="botao secundario" onClick={() => setBandas([...bandas, vazia])}>Adicionar banda</button>
        <button className="botao">Guardar espécie</button>
      </p>
      {erro && <p className="falha" role="alert">{erro}</p>}
      {ok && <p className="confirmado" role="status" style={{ marginTop: "0.75rem" }}>{ok}</p>}
    </form>
  );
}

function NovaReportada({ base, onCriada }) {
  const [planeta, setPlaneta] = useState("");
  const [especie, setEspecie] = useState("");
  const [fonte, setFonte] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  async function guardar(e) {
    e.preventDefault();
    setOk("");
    if (!planeta || !especie || !fonte.trim()) { setErro("Escolhe o planeta e a espécie e indica o artigo."); return; }
    try {
      await enviar("/api/reportadas", { planeta, especie, fonte });
      setOk("Registada.");
      setFonte("");
      onCriada();
    } catch (err) { setErro(err.message); }
  }

  return (
    <form className="painel" onSubmit={guardar} noValidate>
      <h2>Espécie reportada num artigo</h2>
      <p className="nota">É a verdade de referência: o sistema compara as suas conclusões com o que está aqui.</p>
      <div className="campos">
        <label className="campo">Planeta
          <select value={planeta} onChange={(e) => { setPlaneta(e.target.value); setErro(""); }}>
            <option value="">Escolher…</option>
            {base.planetas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>
        <label className="campo">Espécie
          <select value={especie} onChange={(e) => { setEspecie(e.target.value); setErro(""); }}>
            <option value="">Escolher…</option>
            {base.especies.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </label>
        <label className="campo largo">Artigo
          <input value={fonte} onChange={(e) => { setFonte(e.target.value); setErro(""); }} placeholder="Wang et al. 2026" />
        </label>
      </div>
      <button className="botao">Registar</button>
      {erro && <p className="falha" role="alert">{erro}</p>}
      {ok && <p className="confirmado" role="status" style={{ marginTop: "0.75rem" }}>{ok}</p>}
    </form>
  );
}

export default function Base() {
  const [base, setBase] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    fetch("/api/base")
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.erro); return d; })
      .then(setBase)
      .catch((e) => setErro(e.message || "Não foi possível carregar a base."));
  }, []);
  useEffect(carregar, [carregar]);

  if (erro) return <main><p className="falha" role="alert">{erro}</p></main>;
  if (!base) return <main><p className="nota">A carregar a base de conhecimento…</p></main>;

  const nomeE = Object.fromEntries(base.especies.map((e) => [e.id, e.nome]));

  return (
    <main className="empilhar">
      <section className="painel">
        <h2>Planetas ({base.planetas.length})</h2>
        <p className="nota">Abre um planeta para ver os espectros registados, as espécies reportadas e reabrir cada análise.</p>
        <div className="tabela-scroll">
          <table className="dados">
            <thead><tr><th>Planeta</th><th>R★ (R☉)</th><th>Rp (R♃)</th><th>Referência estelar</th><th>Espectros</th><th>Espécies reportadas</th></tr></thead>
            <tbody>
              {base.planetas.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/planetas/${p.id}`}>{p.nome}</Link></td>
                  <td>{fmt(p.rs)} ± {fmt(p.ers)}</td>
                  <td>{fmt(p.rp)} ± {fmt(p.erp)}</td>
                  <td>{p.ref || "—"}</td>
                  <td>{p.observacoes}</td>
                  <td>{base.reportadas.filter((r) => r.planeta === p.id).map((r) => nomeE[r.especie] ?? r.especie).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="painel">
        <h2>Espécies e bandas ({base.especies.length})</h2>
        <div className="tabela-scroll">
          <table className="dados">
            <thead><tr><th>Espécie</th><th>Bandas (µm)</th></tr></thead>
            <tbody>
              {base.especies.map((e, i) => (
                <tr key={e.id}>
                  <td><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: corDe(i), marginRight: 8 }} aria-hidden="true" />{e.nome}</td>
                  <td>{e.bandas.map((b) => `${b.lmin}–${b.lmax}`).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grelha-2">
        <NovaEspecie onCriada={carregar} />
        <NovaReportada base={base} onCriada={carregar} />
      </div>
    </main>
  );
}
