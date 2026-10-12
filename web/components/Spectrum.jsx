"use client";
import { corDe } from "@/lib/apresentacao";

const W = 1000, H = 400;
const M = { l: 64, r: 20, t: 84, b: 48 };
const EIXO = "#3d4280", TXT = "#a7aacb", GRELHA = "#232650";

function ticks(min, max, n = 6) {
  const passo0 = (max - min) / n;
  const p = 10 ** Math.floor(Math.log10(passo0));
  const passo = [1, 2, 2.5, 5, 10].map((k) => k * p).find((s) => s >= passo0) ?? passo0;
  const out = [];
  for (let v = Math.ceil(min / passo) * passo; v <= max + 1e-9; v += passo) out.push(Number(v.toFixed(6)));
  return out;
}

// Atribui uma linha (0..2) a cada rótulo para não se sobreporem
function linhasDeRotulos(itens) {
  const fim = [-Infinity, -Infinity, -Infinity];
  return itens.map((it) => {
    const larg = it.texto.length * 8 + 12;
    let linha = fim.findIndex((x) => it.x - larg / 2 > x);
    if (linha === -1) linha = 2;
    fim[linha] = it.x + larg / 2;
    return linha;
  });
}

export default function Spectrum({ pontos = [], especies = [], estados = {}, medidas = [], selecionada, onSelecionar }) {
  const temDados = pontos.length > 0;
  const x0 = temDados ? Math.max(0, pontos[0].lambda - 0.08) : 0.5;
  const x1 = temDados ? pontos.at(-1).lambda + 0.08 : 5.6;

  // Escala robusta: ignora pontos com erro muito acima do típico e 1% de cada ponta
  let y0 = 0, y1 = 1, foraDeEscala = 0;
  if (temDados) {
    const erros = pontos.map((p) => p.erro).sort((a, b) => a - b);
    const erroMed = erros[Math.floor(erros.length / 2)];
    const bons = pontos.filter((p) => p.erro <= 4 * erroMed);
    const base = bons.length >= 10 ? bons : pontos;
    const lo = base.map((p) => p.profundidade - p.erro).sort((a, b) => a - b);
    const hi = base.map((p) => p.profundidade + p.erro).sort((a, b) => a - b);
    const q = (arr, f) => arr[Math.min(arr.length - 1, Math.max(0, Math.round(f * (arr.length - 1))))];
    y0 = q(lo, 0.01); y1 = q(hi, 0.99);
    const pad = (y1 - y0) * 0.08 || 0.01;
    y0 -= pad; y1 += pad;
    foraDeEscala = pontos.filter((p) => p.profundidade < y0 || p.profundidade > y1).length;
  }

  const sx = (l) => M.l + ((l - x0) / (x1 - x0)) * (W - M.l - M.r);
  const sy = (d) => H - M.b - ((d - y0) / (y1 - y0)) * (H - M.t - M.b);

  const cobertura = Object.fromEntries(medidas.map((m) => [m.banda, m.coberta]));
  const bandas = especies
    .flatMap((e, i) => e.bandas.map((b) => ({ ...b, especie: e.id, nome: e.nome, cor: corDe(i) })))
    .filter((b) => b.lmax > x0 && b.lmin < x1)
    .sort((a, b) => a.lmin - b.lmin);
  const rotulos = bandas.map((b) => ({ x: sx(Math.max(x0, Math.min(x1, (b.lmin + b.lmax) / 2))), texto: b.nome }));
  const linhas = linhasDeRotulos(rotulos);

  const opacidade = (b) => {
    if (temDados && cobertura[b.id] === false) return 0.04;
    const e = estados[b.especie];
    if (e === "detetada") return 0.3;
    if (e === "tentativa") return 0.2;
    if (e === "indicio") return 0.15;
    return temDados ? 0.1 : 0.16;
  };

  const xt = ticks(x0, x1, 10);
  const yt = temDados ? ticks(y0, y1, 5) : [];
  const clicavel = temDados && typeof onSelecionar === "function";

  return (
    <>
      <div className="espectro-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={temDados ? "Espectro de trânsito com as bandas moleculares da base de conhecimento" : "Bandas moleculares da base de conhecimento ao longo do comprimento de onda"}>
          <defs>
            <clipPath id="area"><rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} /></clipPath>
            <pattern id="tracado" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#3d4280" strokeWidth="1" />
            </pattern>
          </defs>

          {temDados && yt.map((t) => (
            <line key={`g${t}`} x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke={GRELHA} />
          ))}

          {bandas.map((b, i) => {
            const xa = sx(Math.max(b.lmin, x0)), xb = sx(Math.min(b.lmax, x1));
            const yRot = 24 + linhas[i] * 18;
            const sel = selecionada === b.id;
            const semDados = temDados && cobertura[b.id] === false;
            const props = clicavel ? { className: "faixa", onClick: () => onSelecionar(b.id) } : {};
            return (
              <g key={b.id} {...props}>
                <title>{`${b.nome} ${b.lmin}–${b.lmax} µm${semDados ? " (sem pontos suficientes)" : ""}`}</title>
                <rect x={xa} y={M.t} width={Math.max(1, xb - xa)} height={H - M.t - M.b} fill={b.cor} opacity={opacidade(b)} />
                {semDados && <rect x={xa} y={M.t} width={Math.max(1, xb - xa)} height={H - M.t - M.b} fill="url(#tracado)" opacity="0.6" />}
                {sel && <rect x={xa} y={M.t} width={Math.max(1, xb - xa)} height={H - M.t - M.b} fill="none" stroke="#e2a6d3" strokeWidth="1.5" />}
                <line x1={rotulos[i].x} x2={rotulos[i].x} y1={yRot + 6} y2={M.t} stroke={b.cor} strokeWidth="1" opacity={semDados ? 0.25 : 0.55} />
                <text x={rotulos[i].x} y={yRot} textAnchor="middle" fontSize="13" fontWeight="600" fill={sel ? "#e2a6d3" : b.cor} opacity={semDados ? 0.45 : 1}>{b.nome}</text>
              </g>
            );
          })}

          <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke={EIXO} />
          {xt.map((t) => (
            <g key={`x${t}`}>
              <line x1={sx(t)} x2={sx(t)} y1={H - M.b} y2={H - M.b + 5} stroke={EIXO} />
              <text x={sx(t)} y={H - M.b + 20} textAnchor="middle" fontSize="12" fill={TXT}>{t}</text>
            </g>
          ))}
          <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill={TXT}>Comprimento de onda (µm)</text>

          {temDados && (
            <>
              {yt.map((t) => (
                <text key={`y${t}`} x={M.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="12" fill={TXT}>{t}</text>
              ))}
              <text x={8} y={M.t - 10} fontSize="12" fill={TXT}>Profundidade (Rp/R★)², %</text>
              {foraDeEscala > 0 && (
                <text x={W - M.r} y={M.t - 10} textAnchor="end" fontSize="12" fill={TXT}>
                  {foraDeEscala} {foraDeEscala === 1 ? "ponto ruidoso fora" : "pontos ruidosos fora"} da escala
                </text>
              )}
              <g clipPath="url(#area)">
                {pontos.map((p, i) => (
                  <g key={i}>
                    <line x1={sx(p.lambda)} x2={sx(p.lambda)} y1={sy(p.profundidade - p.erro)} y2={sy(p.profundidade + p.erro)} stroke="#eceaf6" strokeOpacity="0.22" />
                    <circle cx={sx(p.lambda)} cy={sy(p.profundidade)} r="2" fill="#eceaf6" />
                  </g>
                ))}
              </g>
            </>
          )}
        </svg>
      </div>
      {temDados && (
        <p className="legenda-espectro">
          <span>Clica numa banda para a inspecionar.</span>
          <span>Bandas tracejadas não têm pontos suficientes neste espectro.</span>
        </p>
      )}
    </>
  );
}
