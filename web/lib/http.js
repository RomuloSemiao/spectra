import { ErroParse } from "./parse.js";
import { ErroMotor } from "./engine.js";

export function json(dados, status = 200) {
  return Response.json(dados, { status });
}

export function erro(e) {
  if (e instanceof ErroParse) return json({ erro: e.message }, 422);
  if (e instanceof ErroMotor) return json({ erro: e.message }, e.status);
  console.error(e);
  return json({ erro: "Erro inesperado no servidor." }, 500);
}

export async function corpo(req) {
  try { return await req.json(); } catch { throw new ErroParse("O pedido não traz JSON válido."); }
}
