"use client";
// Espectro + espécies + inspeção de banda, para um resultado de análise.
// Usado na página Analisar e na página de cada planeta.
import { useEffect, useMemo, useState } from "react";
import Spectrum from "./Spectrum";
import Especies from "./Especies";
import Inspetor from "./Inspetor";
import { corDe } from "@/lib/apresentacao";

const ORDEM = { detetada: 0, tentativa: 1, indicio: 2, nao_detetada: 3, sem_cobertura: 4 };

function bandaInicial(especies, medidas) {
  const porBanda = Object.fromEntries(medidas.map((m) => [m.banda, m]));
  const ord = [...especies].sort((a, b) => ORDEM[a.estado] - ORDEM[b.estado]);
  for (const e of ord) {
    const cobertas = e.bandas.map((b) => porBanda[b.id]).filter((m) => m?.coberta);
    if (cobertas.length) return cobertas.sort((a, b) => b.sigma - a.sigma)[0].banda;
  }
  return medidas[0]?.banda ?? null;
}

function exportarCSV(resultado, especies) {
  const estado = Object.fromEntries(especies.map((e) => [e.id, e.estado]));
  const cab = ["ficheiro", "especie", "banda", "lmin_um", "lmax_um", "coberta", "n_banda", "n_continuo",
    "media_banda_pct", "media_continuo_pct", "excesso_ppm", "incerteza_ppm", "sigma", "chi2red_banda",
    "chi2red_continuo", "pontos_com_erro_minimo", "estado_especie"];
  const linhas = resultado.medidas.map((m) => [
    resultado.ficheiro, m.especie, m.banda, m.lmin, m.lmax, m.coberta, m.nBanda, m.nContinuo,
    m.mediaBanda ?? "", m.mediaContinuo ?? "", m.excessoPpm ?? "", m.incertezaPpm ?? "", m.sigma ?? "",
    m.chi2Banda ?? "", m.chi2Continuo ?? "", m.corrigidos?.length ?? 0, estado[m.especie] ?? "",
  ]);
  const csv = [cab, ...linhas].map((l) => l.map((v) => (/[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = resultado.ficheiro.replace(/\.(csv|tsv|txt)$/i, "") + "_medidas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function PainelAnalise({ resultado, especies, especiesBase }) {
  const [selecionada, setSelecionada] = useState(null);
  useEffect(() => {
    setSelecionada(bandaInicial(resultado.especies, resultado.medidas));
  }, [resultado.hash]); // eslint-disable-line react-hooks/exhaustive-deps

  const ordemBase = especiesBase.map((e) => e.id);
  const estados = Object.fromEntries(especies.map((e) => [e.id, e.estado]));
  const medidaSel = resultado.medidas.find((m) => m.banda === selecionada);
  const especieSel = useMemo(() => especies.find((e) => e.bandas.some((b) => b.id === selecionada)), [especies, selecionada]);

  return (
    <>
      <section className="painel espectro" aria-label="Espectro de transmissão">
        <Spectrum pontos={resultado.pontos} especies={especiesBase} estados={estados}
          medidas={resultado.medidas} selecionada={selecionada} onSelecionar={setSelecionada} />
      </section>
      <div className="analise">
        <Especies especies={especies} ordemBase={ordemBase} medidas={resultado.medidas}
          selecionada={selecionada} onSelecionar={setSelecionada} limiares={resultado.limiares}
          onExportar={() => exportarCSV(resultado, especies)} />
        <Inspetor pontos={resultado.pontos} medida={medidaSel} especie={especieSel}
          cor={corDe(Math.max(0, ordemBase.indexOf(especieSel?.id)))} limiares={resultado.limiares} />
      </div>
    </>
  );
}
