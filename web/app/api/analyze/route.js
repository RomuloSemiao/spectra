import { analisar } from "@/lib/pipeline";
import { json, erro } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITE = 5 * 1024 * 1024;

export async function POST(req) {
  try {
    const form = await req.formData();
    const ficheiro = form.get("ficheiro");
    if (!ficheiro || typeof ficheiro === "string") return json({ erro: "Escolhe um ficheiro CSV." }, 400);
    if (ficheiro.size > LIMITE) return json({ erro: "O ficheiro tem mais de 5 MB." }, 413);
    return json(await analisar(await ficheiro.text(), ficheiro.name));
  } catch (e) {
    return erro(e);
  }
}
