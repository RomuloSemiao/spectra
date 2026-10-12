// Textos, cores e formatação partilhados pela interface (seguro no cliente).
// Cores pensadas para fundo escuro (índigo).
export const CORES = ["#8fa8ff", "#5fd3c0", "#ff9b6a", "#b79cff", "#ff8fc3", "#a9d86e", "#6cc4ff", "#f2c94c", "#c0c6da"];
export const corDe = (indice) => CORES[indice % CORES.length];

export const ESTADOS = {
  detetada: "Detetada",
  tentativa: "Tentativa",
  indicio: "Indício",
  nao_detetada: "Não detetada",
  sem_cobertura: "Fora do espectro",
};

export const COMPARACOES = {
  concorda: ["Concorda com o artigo", "bom"],
  concorda_parcial: ["O artigo reporta; aqui só há sinal tentativo", ""],
  consistente: ["Sinal na direção certa, abaixo do limiar; o artigo reporta com um método mais sensível", "parcial"],
  falhou: ["O artigo reporta; as regras não detetaram", "mau"],
  nao_reportada: ["Não reportada no artigo", "mau"],
  fora_do_alcance: ["O artigo reporta, mas a banda principal não está neste espectro", "neutro"],
  sem_referencia: [null, ""],
};

export const fmt = (x, d = 3) => (x === null || x === undefined ? "—" : Number(x).toFixed(d));
export const fmtSigma = (s) => (s === null || s === undefined ? "—" : `${s <= -0.05 ? "−" : ""}${Math.abs(s).toFixed(1)}σ`);
export const fmtPpm = (x) => (x === null || x === undefined ? "—" : `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x)).toLocaleString("pt-PT")} ppm`);
export const faixa = (b) => `${Number(b.lmin).toFixed(2)}–${Number(b.lmax).toFixed(2)} µm`;
