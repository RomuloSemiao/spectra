// Cliente do motor de inferência (só corre no servidor Next.js).
const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:8080";

export class ErroMotor extends Error {
  constructor(mensagem, status = 502) { super(mensagem); this.status = status; }
}

async function pedido(caminho, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${ENGINE_URL}${caminho}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ErroMotor(`O motor de inferência não está acessível em ${ENGINE_URL}.`, 503);
  }
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErroMotor(dados.erro || `Erro do motor (${res.status}).`, res.status);
  return dados;
}

export const motor = {
  base: () => pedido("/base"),
  planeta: (id) => pedido(`/planeta?id=${encodeURIComponent(id)}`),
  decidir: (body) => pedido("/decidir", { method: "POST", body }),
  inferir: (body) => pedido("/inferir", { method: "POST", body }),
  criarPlaneta: (body) => pedido("/planetas", { method: "POST", body }),
  criarObservacao: (body) => pedido("/observacoes", { method: "POST", body }),
  criarEspecie: (body) => pedido("/especies", { method: "POST", body }),
  criarReportada: (body) => pedido("/reportadas", { method: "POST", body }),
};
