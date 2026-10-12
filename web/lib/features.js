// Extração numérica: para cada banda molecular, compara a profundidade de
// trânsito média dentro da banda com o contínuo local (janelas vizinhas fora
// de qualquer banda) e devolve o excesso em unidades de sigma.
//
// Isto é uma heurística de perceção, não um retrieval: o Prolog só recebe
// factos do tipo m(banda, coberta, sigma) e é ele que decide.

export const PARAMETROS = {
  minPontosBanda: 3,      // pontos mínimos dentro da banda
  minPontosContinuo: 3,   // pontos mínimos nos flancos
  fatorErroMinimo: 0.5,   // erro mínimo = fator × mediana local dos erros
  // Que bandas ficam fora do contínuo: "mesma" (só as da própria espécie) ou
  // "todas" (de qualquer espécie). Com muitas espécies na base, "todas" deixa
  // o contínuo quase sem pontos; contra a literatura, "mesma" acerta mais.
  exclusaoContinuo: "mesma",
};

function mediaPonderada(pts) {
  let sw = 0, swx = 0;
  for (const p of pts) { const w = 1 / (p.erro * p.erro); sw += w; swx += w * p.profundidade; }
  const media = swx / sw;
  let erro = 1 / Math.sqrt(sw);
  let chi2red = 1;
  // inflaciona o erro pela dispersão real (chi² reduzido > 1)
  if (pts.length > 1) {
    let chi2 = 0;
    for (const p of pts) chi2 += ((p.profundidade - media) / p.erro) ** 2;
    chi2red = chi2 / (pts.length - 1);
    if (chi2red > 1) erro *= Math.sqrt(chi2red);
  }
  return { media, erro, chi2red };
}

function mediana(xs) {
  const v = [...xs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const r = (x, d = 6) => Number(x.toFixed(d));

export function extrairFeatures(pontos, especies) {
  const todasBandas = especies.flatMap((e) => e.bandas);

  const medidas = [];
  for (const esp of especies) {
    const excluidas = PARAMETROS.exclusaoContinuo === "mesma" ? esp.bandas : todasBandas;
    const dentroDeAlguma = (l) => excluidas.some((x) => l >= x.lmin && l <= x.lmax);
    for (const b of esp.bandas) {
      const largura = b.lmax - b.lmin;
      const idxBanda = [], idxContinuo = [];
      pontos.forEach((p, i) => {
        if (p.lambda >= b.lmin && p.lambda <= b.lmax) idxBanda.push(i);
        else if (((p.lambda >= b.lmin - largura && p.lambda < b.lmin) ||
                  (p.lambda > b.lmax && p.lambda <= b.lmax + largura)) && !dentroDeAlguma(p.lambda)) idxContinuo.push(i);
      });

      const base = {
        especie: esp.id, banda: b.id, lmin: b.lmin, lmax: b.lmax,
        flancos: [[r(b.lmin - largura, 4), b.lmin], [b.lmax, r(b.lmax + largura, 4)]],
        idxBanda, idxContinuo, nBanda: idxBanda.length, nContinuo: idxContinuo.length,
      };

      if (idxBanda.length < PARAMETROS.minPontosBanda) {
        medidas.push({ ...base, coberta: false, sigma: null, motivo: `só ${idxBanda.length} ponto(s) dentro da banda (mínimo ${PARAMETROS.minPontosBanda})` });
        continue;
      }
      if (idxContinuo.length < PARAMETROS.minPontosContinuo) {
        medidas.push({ ...base, coberta: false, sigma: null, motivo: `só ${idxContinuo.length} ponto(s) de contínuo à volta (mínimo ${PARAMETROS.minPontosContinuo})` });
        continue;
      }

      // Erro mínimo: nenhum ponto pode ter erro abaixo de uma fração da
      // mediana local. Evita que um único ponto domine a média ponderada.
      const piso = PARAMETROS.fatorErroMinimo * mediana([...idxBanda, ...idxContinuo].map((i) => pontos[i].erro));
      const corrigidos = [];
      const ajustar = (i) => {
        const p = pontos[i];
        if (p.erro < piso) {
          corrigidos.push({ lambda: p.lambda, erroOriginal: p.erro, erroUsado: r(piso) });
          return { ...p, erro: piso };
        }
        return p;
      };
      const B = mediaPonderada(idxBanda.map(ajustar));
      const C = mediaPonderada(idxContinuo.map(ajustar));
      const excesso = B.media - C.media;
      const incerteza = Math.hypot(B.erro, C.erro);
      const sigma = excesso / incerteza;

      medidas.push({
        ...base, coberta: true,
        mediaBanda: r(B.media), erroBanda: r(B.erro), chi2Banda: r(B.chi2red, 2),
        mediaContinuo: r(C.media), erroContinuo: r(C.erro), chi2Continuo: r(C.chi2red, 2),
        excesso: r(excesso), excessoPpm: Math.round(excesso * 1e4), incertezaPpm: Math.round(incerteza * 1e4),
        incerteza: r(incerteza), sigma: Number(sigma.toFixed(2)),
        erroMinimo: r(piso), corrigidos,
      });
    }
  }
  return medidas;
}
