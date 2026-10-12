// Associa o espectro a um planeta já existente (escolha do utilizador num caso ambíguo).
import { motor } from "@/lib/engine";
import { paraMotor } from "@/lib/pipeline";
import { json, erro, corpo } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { planeta, observacao, medidas = [] } = await corpo(req);
    if (!planeta || !observacao?.hash) return json({ erro: "Falta o planeta ou a observação." }, 400);
    await motor.criarObservacao({ ...observacao, planeta });
    const { especies } = await motor.inferir({ medidas: paraMotor(medidas), planeta });
    return json({ planeta, especies }, 201);
  } catch (e) {
    return erro(e);
  }
}
