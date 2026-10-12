// Tudo o que a base sabe sobre um planeta, mais se cada espectro pode ser reaberto.
import { motor } from "@/lib/engine";
import { existeEspectro } from "@/lib/armazem";
import { json, erro } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  try {
    const { id } = await params;
    const d = await motor.planeta(id);
    d.observacoes = await Promise.all(d.observacoes.map(async (o) => ({ ...o, guardado: await existeEspectro(o.hash) })));
    return json(d);
  } catch (e) {
    return erro(e);
  }
}
