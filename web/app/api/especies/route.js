import { motor } from "@/lib/engine";
import { json, erro, corpo } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { nome, id = "", bandas = [] } = await corpo(req);
    if (!nome?.trim()) return json({ erro: "Indica o nome da espécie." }, 400);
    const limpas = bandas.map((b) => ({ id: b.id ?? "", lmin: Number(b.lmin), lmax: Number(b.lmax) }));
    return json(await motor.criarEspecie({ nome: nome.trim(), id, bandas: limpas }), 201);
  } catch (e) {
    return erro(e);
  }
}
