import { parseEspectro } from "./parse.js";
import { extrairFeatures } from "./features.js";
import { sugerirNome } from "./filename.js";
import { motor } from "./engine.js";
import { guardarEspectro } from "./armazem.js";

export const paraMotor = (medidas) =>
  medidas.map(({ banda, coberta, sigma }) => ({ banda, coberta, sigma }));

export async function analisar(texto, ficheiro) {
  const { pontos, resumo, hash, avisos } = parseEspectro(texto);
  await guardarEspectro(hash, texto);
  const base = await motor.base();
  const medidas = extrairFeatures(pontos, base.especies);
  const nomeSugerido = sugerirNome(ficheiro);

  // 1) identificação
  let identificacao;
  if (resumo.rs !== null && resumo.rp !== null) {
    identificacao = await motor.decidir({
      hash,
      nome: nomeSugerido,
      rs: resumo.rs, ers: resumo.ers ?? 0.05 * resumo.rs,
      rp: resumo.rp, erp: resumo.erp ?? 0.05 * resumo.rp,
      ref: resumo.ref,
    });
  } else {
    identificacao = {
      decisao: "ambiguo", planeta: null, nome: null, candidatos: [],
      motivos: ["O ficheiro não tem raios da estrela e do planeta: escolhe o planeta ou cria um novo."],
    };
  }

  // 2) planeta conhecido -> regista esta observação automaticamente
  if (identificacao.decisao === "existe") {
    await motor.criarObservacao({
      hash, planeta: identificacao.planeta, autores: resumo.autores,
      ficheiro, lmin: resumo.lmin, lmax: resumo.lmax,
    });
    identificacao.observacaoRegistada = true;
  }

  // 3) inferência de espécies (corre sempre, não depende da identificação)
  const planeta = ["existe", "duplicado"].includes(identificacao.decisao) ? identificacao.planeta : "";
  const { especies, limiares } = await motor.inferir({ medidas: paraMotor(medidas), planeta, rs: resumo.rs });

  return {
    ficheiro, hash, resumo, avisos, nomeSugerido,
    pontos, medidas, identificacao, especies, limiares,
  };
}
