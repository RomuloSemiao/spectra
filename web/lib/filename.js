// Sugere o nome do planeta a partir do nome do ficheiro exportado pelo
// NASA Exoplanet Archive, ex.: "table_HAT-P-30-b-Claringbold-et-al_-2026.csv"
// -> "HAT-P-30 b". É só uma sugestão: o utilizador confirma antes de gravar.
export function sugerirNome(ficheiro = "") {
  const base = ficheiro.replace(/^.*[\\/]/, "").replace(/\.(csv|tsv|txt)$/i, "");
  const m = base.match(/^table_(.+?)-([a-z])-([A-Z][^]*?)-et-al/);
  if (m) return `${m[1]} ${m[2]}`;
  // fallback: "<estrela>-<letra>" no início do nome
  const m2 = base.match(/^(?:table_)?([A-Za-z]+[- ]?[A-Za-z]*-?\d+[A-Za-z]?)[- _]([b-i])(?:[-_ ]|$)/);
  if (m2) return `${m2[1]} ${m2[2]}`;
  return "";
}
