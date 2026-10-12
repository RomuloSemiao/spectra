"use client";
import { useEffect, useRef, useState } from "react";
import Spectrum from "@/components/Spectrum";
import Alvo from "@/components/Alvo";
import PainelAnalise from "@/components/PainelAnalise";

export default function Pagina() {
  const [base, setBase] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [especies, setEspecies] = useState([]);
  const [confirmado, setConfirmado] = useState(null);
  const [aAnalisar, setAAnalisar] = useState(false);
  const [erro, setErro] = useState("");
  const [arrastar, setArrastar] = useState(false);
  const input = useRef(null);

  const carregarBase = () =>
    fetch("/api/base")
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.erro); return d; })
      .then(setBase);

  useEffect(() => {
    carregarBase().catch((e) => setErro(e.message || "Não foi possível carregar a base de conhecimento."));
  }, []);

  async function analisar(ficheiro) {
    if (!ficheiro) return;
    if (!/\.(csv|tsv|txt)$/i.test(ficheiro.name)) { setErro("Escolhe um ficheiro .csv exportado do NASA Exoplanet Archive."); return; }
    setAAnalisar(true); setErro(""); setConfirmado(null);
    try {
      const form = new FormData();
      form.append("ficheiro", ficheiro);
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok) throw new Error(d.erro || "A análise falhou.");
      setResultado(d);
      setEspecies(d.especies);
      carregarBase().catch(() => {});
    } catch (e) {
      setErro(e.message);
    } finally {
      setAAnalisar(false);
      if (input.current) input.current.value = "";
    }
  }

  function guardado(info) {
    setConfirmado(info);
    setEspecies(info.especies);
    carregarBase().catch(() => {});
  }

  const zonaLargar = {
    onDragOver: (e) => { e.preventDefault(); setArrastar(true); },
    onDragLeave: () => setArrastar(false),
    onDrop: (e) => { e.preventDefault(); setArrastar(false); analisar(e.dataTransfer.files[0]); },
  };

  return (
    <main {...(resultado ? zonaLargar : {})}>
      <input ref={input} type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => analisar(e.target.files[0])} />
      {erro && <p className="falha" role="alert" style={{ marginTop: 0, marginBottom: "1rem" }}>{erro}</p>}

      {resultado ? (
        <>
          <Alvo resultado={resultado} confirmado={confirmado} onGuardado={guardado}
            onTrocar={() => input.current?.click()} aAnalisar={aAnalisar} />
          <PainelAnalise resultado={resultado} especies={especies} especiesBase={base?.especies ?? []} />
        </>
      ) : (
        <section className="painel espectro" aria-label="Espectro de transmissão" style={{ marginTop: 0 }}>
          <Spectrum especies={base?.especies ?? []} />
          <div className="largar" data-ativo={arrastar} {...zonaLargar}>
            <p><strong>Carrega um espectro de transmissão</strong></p>
            <p>
              CSV da tabela de espectroscopia atmosférica do NASA Exoplanet Archive. O sistema identifica o planeta,
              mede o excesso de profundidade em cada banda molecular e explica cada conclusão.
            </p>
            <button className="botao" onClick={() => input.current?.click()} disabled={aAnalisar}>
              {aAnalisar ? "A analisar…" : "Escolher ficheiro"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
