// Reabre um espectro guardado e volta a analisá-lo com a base atual.
// Como o espectro já está registado, a identificação dá "duplicado" e nada é gravado.
import { lerEspectro } from "@/lib/armazem";
import { analisar } from "@/lib/pipeline";
import { json, erro } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    const { hash } = await params;
    const texto = await lerEspectro(hash);
    if (!texto) return json({ erro: "O ficheiro original deste espectro não está guardado. Carrega-o de novo na página Analisar." }, 404);
    const ficheiro = new URL(req.url).searchParams.get("ficheiro") || `${hash.slice(0, 12)}.csv`;
    return json(await analisar(texto, ficheiro));
  } catch (e) {
    return erro(e);
  }
}
