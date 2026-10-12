"use client";
import { useState } from "react";
import { fmt } from "@/lib/apresentacao";

async function enviar(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dados.erro || "Não foi possível guardar.");
  return dados;
}

const observacaoDe = (r) => ({
  hash: r.hash, autores: r.resumo.autores, ficheiro: r.ficheiro, lmin: r.resumo.lmin, lmax: r.resumo.lmax,
});

function FormularioNovo({ resultado, onGuardado }) {
  const r = resultado.resumo;
  const [f, setF] = useState({
    nome: resultado.nomeSugerido || "",
    rs: r.rs ?? "", ers: r.ers ?? "", rp: r.rp ?? "", erp: r.erp ?? "", ref: r.ref || "",
  });
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const muda = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErro(""); };

  async function guardar(e) {
    e.preventDefault();
    if (!f.nome.trim()) { setErro("Indica o nome do planeta."); return; }
    for (const k of ["rs", "ers", "rp", "erp"]) {
      if (f[k] === "" || !Number.isFinite(Number(f[k]))) { setErro("Preenche os raios e os erros com números."); return; }
    }
    setAGuardar(true);
    try {
      const d = await enviar("/api/planetas", { ...f, observacao: observacaoDe(resultado), medidas: resultado.medidas });
      onGuardado({ planeta: d.planeta.id, nome: d.planeta.nome, especies: d.especies, criado: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate>
      <div className="campos">
        <label className="campo largo">Nome do planeta
          <input value={f.nome} onChange={muda("nome")} placeholder="TOI-1234 b" />
        </label>
        <label className="campo">R★ (R☉)<input inputMode="decimal" value={f.rs} onChange={muda("rs")} /></label>
        <label className="campo">σ R★<input inputMode="decimal" value={f.ers} onChange={muda("ers")} /></label>
        <label className="campo">Rp (R♃)<input inputMode="decimal" value={f.rp} onChange={muda("rp")} /></label>
        <label className="campo">σ Rp<input inputMode="decimal" value={f.erp} onChange={muda("erp")} /></label>
        <label className="campo largo">Referência dos parâmetros estelares
          <input value={f.ref} onChange={muda("ref")} />
        </label>
      </div>
      {erro && <p className="falha" role="alert">{erro}</p>}
      <button className="botao" disabled={aGuardar}>{aGuardar ? "A adicionar…" : "Adicionar planeta à base"}</button>
    </form>
  );
}

function EscolhaAmbigua({ resultado, onGuardado }) {
  const cands = resultado.identificacao.candidatos;
  const [escolha, setEscolha] = useState(cands[0]?.id ?? "novo");
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const nomeEscolhido = cands.find((c) => c.id === escolha)?.nome;

  async function associar() {
    setAGuardar(true); setErro("");
    try {
      const d = await enviar("/api/observacoes", { planeta: escolha, observacao: observacaoDe(resultado), medidas: resultado.medidas });
      onGuardado({ planeta: escolha, nome: nomeEscolhido ?? escolha, especies: d.especies, criado: false });
    } catch (err) {
      setErro(err.message);
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <>
      <fieldset className="opcoes">
        <legend>A que planeta pertence este espectro?</legend>
        {cands.map((c) => (
          <label key={c.id}>
            <input type="radio" name="planeta" value={c.id} checked={escolha === c.id} onChange={() => setEscolha(c.id)} />
            {c.nome}
            <span className="z">z = {fmt(c.z, 2)}</span>
          </label>
        ))}
        <label>
          <input type="radio" name="planeta" value="novo" checked={escolha === "novo"} onChange={() => setEscolha("novo")} />
          Planeta novo
        </label>
      </fieldset>
      {escolha === "novo" ? (
        <FormularioNovo resultado={resultado} onGuardado={onGuardado} />
      ) : (
        <>
          {erro && <p className="falha" role="alert">{erro}</p>}
          <button className="botao" onClick={associar} disabled={aGuardar}>
            {aGuardar ? "A associar…" : `Associar a ${nomeEscolhido}`}
          </button>
        </>
      )}
    </>
  );
}

const DECISOES = {
  existe: "Planeta conhecido",
  duplicado: "Espectro já registado",
  novo: "Planeta fora da base",
  ambiguo: "Identificação ambígua",
};

export default function Alvo({ resultado, confirmado, onGuardado, onTrocar, aAnalisar }) {
  const id = resultado.identificacao;
  const r = resultado.resumo;

  const nome = confirmado?.nome ?? id.nome ?? (id.decisao === "novo" ? resultado.nomeSugerido : null);
  const classe = confirmado ? "criado" : id.decisao;
  const rotulo = confirmado ? (confirmado.criado ? "Adicionado à base" : "Associado pelo utilizador") : DECISOES[id.decisao];

  return (
    <section className="painel" aria-labelledby="titulo-alvo">
      <div className="alvo">
        <div>
          <p className="alvo-rotulo">Alvo</p>
          <h2 id="titulo-alvo" className={`alvo-nome ${nome ? "" : "desconhecido"}`}>{nome || "Por identificar"}</h2>
          <span className={`decisao ${classe}`}>{rotulo}</span>
          {!confirmado && <ul className="motivos">{id.motivos.map((m) => <li key={m}>{m}</li>)}</ul>}
          {id.observacaoRegistada && !confirmado && <p className="confirmado">Espectro associado ao histórico do planeta.</p>}
          {!confirmado && id.decisao === "novo" && <FormularioNovo resultado={resultado} onGuardado={onGuardado} />}
          {!confirmado && id.decisao === "ambiguo" && <EscolhaAmbigua resultado={resultado} onGuardado={onGuardado} />}
          {resultado.avisos?.length > 0 && (
            <div className="avisos" role="status"><ul>{resultado.avisos.map((a) => <li key={a}>{a}</li>)}</ul></div>
          )}
        </div>
        <div>
          <dl className="ficha">
            <dt>Ficheiro</dt><dd>{resultado.ficheiro}</dd>
            <dt>Autores</dt><dd>{r.autores || "—"}</dd>
            <dt>Cobertura</dt><dd>{fmt(r.lmin, 2)}–{fmt(r.lmax, 2)} µm</dd>
            <dt>Pontos</dt><dd>{r.n}</dd>
            <dt>R★</dt><dd>{fmt(r.rs)} ± {fmt(r.ers)} R☉</dd>
            <dt>Rp</dt><dd>{fmt(r.rp)} ± {fmt(r.erp)} R♃</dd>
            <dt>Ref. estelar</dt><dd>{r.ref || "—"}</dd>
          </dl>
          <p style={{ margin: "1.1rem 0 0" }}>
            <button className="botao secundario" onClick={onTrocar} disabled={aAnalisar}>
              {aAnalisar ? "A analisar…" : "Analisar outro espectro"}
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
