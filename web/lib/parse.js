// Parser dos CSVs de espectroscopia de trânsito (NASA Exoplanet Archive).
// Trata os problemas encontrados nos ficheiros reais:
//   - separador ";" (ou ","), CRLF, BOM
//   - linha espúria "Column1;Column2;..." vinda do Excel/Power Query
//   - entidades HTML nos autores ("Ca&ntilde;as")
//   - números convertidos em datas pelo Excel ("1.07" -> "01/07/2026")
//   - vírgula decimal
import { createHash } from "node:crypto";

const OBRIGATORIAS = ["CENTRALWAVELNG", "PL_TRANDEP", "PL_TRANDEPERR1"];

const ENTIDADES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ntilde: "ñ", Ntilde: "Ñ", ccedil: "ç", Ccedil: "Ç",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  atilde: "ã", otilde: "õ", acirc: "â", ecirc: "ê", ocirc: "ô",
  agrave: "à", auml: "ä", euml: "ë", ouml: "ö", uuml: "ü", Ouml: "Ö", Uuml: "Ü",
};

export function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n] ?? m);
}

function splitLinha(linha, sep) {
  const out = [];
  let cur = "", aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') { cur += '"'; i++; }
      else aspas = !aspas;
    } else if (c === sep && !aspas) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

// Converte texto em número. Devolve { valor, recuperado } ou null.
function numero(txt) {
  if (txt === undefined || txt === "") return null;
  let t = txt.trim();
  // Excel em locale pt: "1.07" vira a data "01/07/AAAA" -> recupera 1.07
  const data = t.match(/^(\d{1,2})\/(\d{1,2})\/\d{2,4}$/);
  if (data) return { valor: Number(`${Number(data[1])}.${data[2]}`), recuperado: true };
  if (/^-?\d+,\d+$/.test(t)) t = t.replace(",", ".");
  const v = Number(t);
  return Number.isFinite(v) ? { valor: v, recuperado: false } : null;
}

function mediana(xs) {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export class ErroParse extends Error {}

export function parseEspectro(texto) {
  const avisos = [];
  let linhas = texto.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!linhas.length) throw new ErroParse("O ficheiro está vazio.");

  if (/^"?Column1"?[;,]/.test(linhas[0])) {
    linhas = linhas.slice(1);
    avisos.push("Removida a linha de cabeçalho extra \"Column1;Column2;…\" (artefacto do Excel).");
  }

  const sep = (linhas[0].match(/;/g) || []).length >= (linhas[0].match(/,/g) || []).length ? ";" : ",";
  const cab = splitLinha(linhas[0], sep).map((c) => c.toUpperCase());
  const falta = OBRIGATORIAS.filter((c) => !cab.includes(c));
  if (falta.length) {
    throw new ErroParse(`Faltam colunas obrigatórias: ${falta.join(", ")}. Este não parece um espectro de trânsito do NASA Exoplanet Archive.`);
  }
  const col = Object.fromEntries(cab.map((c, i) => [c, i]));

  const pontos = [];
  const meta = { radj: [], radjErr: [], stRad: [], stRadErr: [], tranmid: [], autores: new Set(), refEstrela: new Set() };
  const recuperados = new Set();
  let descartadas = 0;

  for (const linha of linhas.slice(1)) {
    const v = splitLinha(linha, sep);
    const get = (c) => (col[c] === undefined ? undefined : v[col[c]]);
    const num = (c) => {
      const r = numero(get(c));
      if (r?.recuperado) recuperados.add(c);
      return r ? r.valor : null;
    };

    const lam = num("CENTRALWAVELNG");
    const dep = num("PL_TRANDEP");
    const e1 = num("PL_TRANDEPERR1");
    const e2 = num("PL_TRANDEPERR2");
    if (lam === null || dep === null || e1 === null) { descartadas++; continue; }
    const err = e2 === null ? Math.abs(e1) : (Math.abs(e1) + Math.abs(e2)) / 2;
    if (!(err > 0)) { descartadas++; continue; }

    pontos.push({ lambda: lam, largura: num("BANDWIDTH"), profundidade: dep, erro: err });

    for (const [k, c] of [["radj", "PL_RADJ"], ["radjErr", "PL_RADJERR1"], ["stRad", "ST_RAD"], ["stRadErr", "ST_RADERR1"], ["tranmid", "PL_TRANMID"]]) {
      const x = num(c);
      if (x !== null) meta[k].push(Math.abs(x));
    }
    const a = get("PL_TRANDEP_AUTHORS"); if (a) meta.autores.add(decodeEntities(a));
    const r = get("ST_RAD_AUTHORS"); if (r) meta.refEstrela.add(decodeEntities(r));
  }

  if (pontos.length < 5) throw new ErroParse("O ficheiro tem menos de 5 pontos válidos.");
  if (descartadas) avisos.push(`${descartadas} linha(s) sem comprimento de onda, profundidade ou erro válidos foram ignoradas.`);
  for (const c of recuperados) {
    avisos.push(`A coluna ${c} tinha valores convertidos em datas pelo Excel; foram recuperados (ex.: 01/07 → 1.07). Confirma no artigo e evita abrir o CSV no Excel.`);
  }

  pontos.sort((a, b) => a.lambda - b.lambda);

  // hash do conteúdo científico normalizado: o mesmo espectro dá o mesmo hash
  const hash = createHash("sha256")
    .update(pontos.map((p) => `${p.lambda.toFixed(6)}|${p.profundidade.toFixed(6)}|${p.erro.toFixed(6)}`).join("\n"))
    .digest("hex");

  const resumo = {
    n: pontos.length,
    lmin: pontos[0].lambda,
    lmax: pontos.at(-1).lambda,
    rs: mediana(meta.stRad),
    ers: mediana(meta.stRadErr),
    rp: mediana(meta.radj),
    erp: mediana(meta.radjErr),
    tranmid: mediana(meta.tranmid),
    autores: [...meta.autores].join("; "),
    ref: [...meta.refEstrela][0] ?? "",
  };
  if (resumo.rs === null || resumo.rp === null) {
    avisos.push("Sem ST_RAD ou PL_RADJ: não é possível comparar com os planetas da base pelos raios.");
  }

  return { pontos, resumo, hash, avisos };
}
