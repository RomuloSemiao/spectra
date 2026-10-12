// Corre o pipeline completo sobre CSVs locais, contra um motor a correr.
// Uso: ENGINE_URL=http://localhost:8080 node scripts/testar.js caminho/*.csv
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { analisar } from "../lib/pipeline.js";

for (const f of process.argv.slice(2)) {
  const r = await analisar(await readFile(f, "utf8"), basename(f));
  const id = r.identificacao;
  console.log(`\n${basename(f)}`);
  console.log(`  nome sugerido: ${r.nomeSugerido || "—"} | λ ${r.resumo.lmin.toFixed(2)}–${r.resumo.lmax.toFixed(2)} µm | ${r.resumo.n} pontos`);
  console.log(`  decisão: ${id.decisao}${id.nome ? " → " + id.nome : ""}${id.candidatos?.length ? " [" + id.candidatos.map((c) => `${c.nome} z=${c.z.toFixed(2)}`).join(", ") + "]" : ""}`);
  for (const a of r.avisos) console.log(`  aviso: ${a}`);
  for (const e of r.especies) {
    const bs = e.bandas.map((b) => `${b.id}:${b.coberta ? b.sigma : "—"}`).join(" ");
    console.log(`  ${e.nome.padEnd(4)} ${e.estado.padEnd(14)} ${bs}`);
  }
}
