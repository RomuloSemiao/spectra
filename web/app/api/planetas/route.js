// Cria um planeta novo, associa-lhe o espectro e volta a inferir as espécies.
import { motor } from "@/lib/engine";
import { paraMotor } from "@/lib/pipeline";
import { json, erro, corpo } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { nome, rs, ers, rp, erp, ref = "", observacao, medidas = [] } = await corpo(req);
    if (!nome?.trim()) return json({ erro: "Indica o nome do planeta." }, 400);
    const nums = { rs, ers, rp, erp };
    for (const [k, v] of Object.entries(nums)) {
      if (!Number.isFinite(Number(v)) || Number(v) < 0) return json({ erro: `Valor inválido em ${k}.` }, 400);
    }
    const { id } = await motor.criarPlaneta({
      nome: nome.trim(), rs: Number(rs), ers: Number(ers), rp: Number(rp), erp: Number(erp), ref,
    });
    if (observacao) await motor.criarObservacao({ ...observacao, planeta: id });
    const { especies } = await motor.inferir({ medidas: paraMotor(medidas), planeta: id });
    return json({ planeta: { id, nome: nome.trim() }, especies }, 201);
  } catch (e) {
    return erro(e);
  }
}
