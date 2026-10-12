import { motor } from "@/lib/engine";
import { json, erro, corpo } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { planeta, especie, fonte } = await corpo(req);
    if (!planeta || !especie || !fonte?.trim()) return json({ erro: "Indica o planeta, a espécie e a fonte." }, 400);
    return json(await motor.criarReportada({ planeta, especie, fonte: fonte.trim() }), 201);
  } catch (e) {
    return erro(e);
  }
}
