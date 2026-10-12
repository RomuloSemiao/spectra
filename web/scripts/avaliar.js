// Avalia o motor contra a literatura: para cada CSV, compara as conclusões
// com as espécies reportadas registadas na base.
// Uso: ENGINE_URL=http://localhost:8080 node scripts/avaliar.js ficheiro.csv...
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { parseEspectro } from "../lib/parse.js";
import { extrairFeatures } from "../lib/features.js";
import { sugerirNome } from "../lib/filename.js";
import { paraMotor } from "../lib/pipeline.js";
import { motor } from "../lib/engine.js";

const base = await motor.base();
const idDe = (n) => n.normalize("NFD").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
const tot = { acertos: 0, reportadas: 0, foraAlcance: 0, falsosPositivos: 0 };

for (const f of process.argv.slice(2)) {
  const { pontos, resumo } = parseEspectro(await readFile(f, "utf8"));
  const medidas = extrairFeatures(pontos, base.especies);
  const planeta = idDe(sugerirNome(basename(f)));
  const { especies } = await motor.inferir({ medidas: paraMotor(medidas), planeta, rs: resumo.rs });
  const rep = especies.filter((e) => e.fonte);
  const fp = especies.filter((e) => !e.fonte && ["detetada", "tentativa"].includes(e.estado));
  console.log(`\n${sugerirNome(basename(f))}`);
  for (const e of rep) {
    console.log(`  reportada ${e.nome.padEnd(5)} → ${e.estado.padEnd(14)} ${e.comparacao}`);
    if (e.comparacao === "fora_do_alcance") tot.foraAlcance++;
    else { tot.reportadas++; if (["detetada", "tentativa"].includes(e.estado)) tot.acertos++; }
  }
  for (const e of fp) { console.log(`  NÃO reportada ${e.nome.padEnd(5)} → ${e.estado}`); tot.falsosPositivos++; }
  for (const e of especies.filter((x) => x.alertas?.length)) for (const a of e.alertas) console.log(`  alerta ${e.nome}: ${a}`);
}
console.log(`\nReportadas detetadas (detetada ou tentativa): ${tot.acertos}/${tot.reportadas} | fora do alcance: ${tot.foraAlcance} | falsos positivos: ${tot.falsosPositivos}`);
