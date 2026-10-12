"use client";
import ReguaSigma from "./ReguaSigma";
import { ESTADOS, COMPARACOES, fmt, fmtSigma, fmtPpm, faixa } from "@/lib/apresentacao";

const W = 600, H = 250, M = { l: 52, r: 12, t: 16, b: 34 };

function Zoom({ pontos, medida, cor }) {
  const usados = new Set([...medida.idxBanda, ...medida.idxContinuo]);
  const dentroBanda = new Set(medida.idxBanda);
  const corrigidos = new Set(medida.corrigidos.map((c) => c.lambda));
  const x0 = medida.flancos[0][0], x1 = medida.flancos[1][1];
  const visiveis = pontos.map((p, i) => ({ ...p, i })).filter((p) => p.lambda >= x0 && p.lambda <= x1);
  const ref = visiveis.filter((p) => usados.has(p.i));
  if (!ref.length) return null;

  // escala vertical pelos pontos usados, sem deixar barras gigantes esmagarem o resto
  const erros = ref.map((p) => p.erro).sort((a, b) => a - b);
  const eMed = erros[Math.floor(erros.length / 2)];
  const cap = (p) => Math.min(p.erro, 3 * eMed);
  let y0 = Math.min(...ref.map((p) => p.profundidade - cap(p)), medida.mediaContinuo);
  let y1 = Math.max(...ref.map((p) => p.profundidade + cap(p)), medida.mediaBanda);
  const pad = (y1 - y0) * 0.1 || 0.01; y0 -= pad; y1 += pad;

  const sx = (l) => M.l + ((l - x0) / (x1 - x0)) * (W - M.l - M.r);
  const sy = (d) => H - M.b - ((d - y0) / (y1 - y0)) * (H - M.t - M.b);
  const passo = (x1 - x0) / 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Pontos dentro da banda ${faixa(medida)} comparados com o contínuo vizinho`}>
      <defs><clipPath id="zoom"><rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} /></clipPath></defs>
      {medida.flancos.map(([a, b], k) => (
        <rect key={k} x={sx(a)} y={M.t} width={sx(b) - sx(a)} height={H - M.t - M.b} fill="#a7aacb" opacity="0.05" />
      ))}
      <rect x={sx(medida.lmin)} y={M.t} width={sx(medida.lmax) - sx(medida.lmin)} height={H - M.t - M.b} fill={cor} opacity="0.13" />
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#3d4280" />
      {[0, 1, 2, 3, 4].map((k) => {
        const v = x0 + k * passo;
        return <text key={k} x={sx(v)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="#a7aacb">{v.toFixed(2)}</text>;
      })}
      {[0, 1, 2, 3].map((k) => {
        const v = y0 + (k * (y1 - y0)) / 3;
        return <text key={k} x={M.l - 6} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#a7aacb">{v.toFixed(3)}</text>;
      })}
      <g clipPath="url(#zoom)">
        {visiveis.map((p) => {
          const naBanda = dentroBanda.has(p.i), usado = usados.has(p.i);
          const c = naBanda ? cor : "#a7aacb";
          const op = usado ? 1 : 0.18;
          return (
            <g key={p.i} opacity={op}>
              <line x1={sx(p.lambda)} x2={sx(p.lambda)} y1={sy(p.profundidade - p.erro)} y2={sy(p.profundidade + p.erro)} stroke={c} strokeOpacity="0.4" />
              <circle cx={sx(p.lambda)} cy={sy(p.profundidade)} r="3" fill={c} />
              {corrigidos.has(p.lambda) && <circle cx={sx(p.lambda)} cy={sy(p.profundidade)} r="7.5" fill="none" stroke="#e2a6d3" strokeWidth="1.5" />}
            </g>
          );
        })}
        <line x1={M.l} x2={W - M.r} y1={sy(medida.mediaContinuo)} y2={sy(medida.mediaContinuo)} stroke="#eceaf6" strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="6 5" />
        <line x1={sx(medida.lmin)} x2={sx(medida.lmax)} y1={sy(medida.mediaBanda)} y2={sy(medida.mediaBanda)} stroke={cor} strokeWidth="3" />
      </g>
    </svg>
  );
}

export default function Inspetor({ pontos, medida, especie, cor, limiares }) {
  if (!medida || !especie) {
    return (
      <section className="painel inspetor" aria-label="Inspeção de banda">
        <h2 className="titulo-painel">Inspeção de banda</h2>
        <p className="nota">Escolhe uma banda na lista ou no gráfico para ver como o sinal foi medido.</p>
      </section>
    );
  }
  const relevante = especie.fonte || especie.comparacao === "nao_reportada";
  const [textoComp, classeComp] = relevante ? COMPARACOES[especie.comparacao] ?? [null, ""] : [null, ""];
  const forte = limiares?.forte ?? 5, fraca = limiares?.fraca ?? 3;

  return (
    <section className="painel inspetor" aria-labelledby="titulo-inspetor">
      <p className="alvo-rotulo">Inspeção de banda</p>
      <h2 id="titulo-inspetor" className="inspetor-titulo">{especie.nome}, {faixa(medida)}</h2>

      {!medida.coberta ? (
        <>
          <p className="nota" style={{ marginTop: "0.6rem" }}>
            Banda não avaliada: {medida.motivo}. O espectro não permite dizer nada sobre esta banda.
          </p>
        </>
      ) : (
        <>
          <Zoom pontos={pontos} medida={medida} cor={cor} />
          <p className="legenda-zoom">
            <span><i style={{ borderTop: "3px solid " + cor }} />média na banda</span>
            <span><i style={{ borderTop: "1.5px dashed #eceaf6" }} />média do contínuo</span>
            {medida.corrigidos.length > 0 && <span><i style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid #e2a6d3" }} />erro mínimo aplicado</span>}
          </p>
          <div className="resultado-sigma">
            <span className="grande">{fmtSigma(medida.sigma)}</span>
            <span className="conta">
              excesso {fmtPpm(medida.excessoPpm)} ± {medida.incertezaPpm.toLocaleString("pt-PT")} ppm
            </span>
          </div>
          <ReguaSigma sigma={medida.sigma} forte={forte} fraca={fraca} indicio={limiares?.indicio ?? 2} altura={16} />

          <table className="tabela-num">
            <thead><tr><th></th><th>Banda</th><th>Contínuo</th></tr></thead>
            <tbody>
              <tr><td>Pontos</td><td>{medida.nBanda}</td><td>{medida.nContinuo}</td></tr>
              <tr><td>Média ponderada (%)</td><td>{fmt(medida.mediaBanda, 4)}</td><td>{fmt(medida.mediaContinuo, 4)}</td></tr>
              <tr><td>Incerteza (ppm)</td><td>{Math.round(medida.erroBanda * 1e4)}</td><td>{Math.round(medida.erroContinuo * 1e4)}</td></tr>
              <tr><td>χ² reduzido</td><td>{fmt(medida.chi2Banda, 2)}</td><td>{fmt(medida.chi2Continuo, 2)}</td></tr>
            </tbody>
          </table>
          <p className="nota" style={{ marginTop: "0.6rem" }}>
            Contínuo: {medida.flancos.map(([a, b]) => `${a.toFixed(2)}–${b.toFixed(2)} µm`).join(" e ")}, sem os pontos de outras bandas desta espécie.
            Quando o χ² reduzido passa de 1, a incerteza é inflacionada pela dispersão real.
          </p>
          {medida.corrigidos.length > 0 && (
            <p className="corrigidos">
              Erro mínimo ({Math.round(medida.erroMinimo * 1e4)} ppm) aplicado a {medida.corrigidos.length === 1 ? "1 ponto" : `${medida.corrigidos.length} pontos`}:{" "}
              {medida.corrigidos.map((c) => `${c.lambda.toFixed(3)} µm (${Math.round(c.erroOriginal * 1e4)} → ${Math.round(c.erroUsado * 1e4)} ppm)`).join(", ")}.
              Um erro muito abaixo dos vizinhos faria esse ponto dominar a média.
            </p>
          )}
        </>
      )}

      <div className="caixa-regra">
        <p><span className={`estado ${especie.estado}`}>{ESTADOS[especie.estado]}</span>&nbsp; {especie.motivo}</p>
        <p>Regra: {especie.regra}</p>
        {especie.falta && <p>{especie.falta}</p>}
        {especie.alertas?.length > 0 && <ul className="alertas">{especie.alertas.map((a) => <li key={a}>{a}</li>)}</ul>}
        {textoComp && <p className={`comparacao ${classeComp}`}>{textoComp}{especie.fonte ? ` (${especie.fonte})` : ""}</p>}
      </div>
    </section>
  );
}
