// Guarda o CSV original de cada espectro, pelo hash do conteúdo, para o
// poder reabrir mais tarde (e reanalisar com a base de conhecimento atual).
// No Docker, DATA_DIR aponta para um volume.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const DIR = process.env.DATA_DIR || join(process.cwd(), "data", "espectros");
const caminho = (hash) => join(DIR, `${hash.replace(/[^a-f0-9]/gi, "")}.csv`);

export async function guardarEspectro(hash, texto) {
  try {
    await mkdir(DIR, { recursive: true });
    await access(caminho(hash)).catch(() => writeFile(caminho(hash), texto, "utf8"));
  } catch (e) {
    console.error("Não foi possível guardar o espectro:", e.message);
  }
}

export async function lerEspectro(hash) {
  try { return await readFile(caminho(hash), "utf8"); } catch { return null; }
}

export async function existeEspectro(hash) {
  try { await access(caminho(hash)); return true; } catch { return false; }
}
