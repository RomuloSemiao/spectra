import { PARAMETROS } from "@/lib/features";

export const metadata = { title: "Método, espectros de trânsito" };

export default function Metodo() {
  return (
    <main>
      <article className="painel metodo" style={{ padding: "1.5rem 2rem 2rem" }}>
        <h2>O que o sistema faz</h2>
        <p>
          Para cada espectro de transmissão, o sistema separa duas tarefas. Uma camada numérica mede o
          excesso de profundidade de trânsito em janelas espectrais associadas a cada espécie química. Um motor
          de inferência em Prolog recebe apenas essas medidas, já resumidas, e aplica regras explícitas para
          decidir o estado de cada espécie e a identidade do planeta. Cada conclusão vem acompanhada da regra
          que a produziu e dos números em que se baseia.
        </p>
        <p>
          <strong>Não é um retrieval atmosférico.</strong> Não há modelo de transferência radiativa, nem
          abundâncias, nem temperaturas. O resultado é uma triagem rápida e auditável de assinaturas espectrais,
          útil para orientar uma análise completa.
        </p>

        <h2>Excesso por banda</h2>
        <p>
          Para uma banda [λ₁, λ₂] de largura Δλ, os pontos dentro da banda são comparados com o contínuo local:
          os pontos em [λ₁ − Δλ, λ₁) e (λ₂, λ₂ + Δλ], excluindo os que caem noutra banda da mesma espécie. Em ambos
          os conjuntos calcula-se a média ponderada pelo inverso da variância.
        </p>
        <div className="formula">σ = (D̄<sub>banda</sub> − D̄<sub>contínuo</sub>) / √(ε²<sub>banda</sub> + ε²<sub>contínuo</sub>)</div>
        <p>
          D̄ é a profundidade média, (Rp/R★)², e ε a sua incerteza. Quando o χ² reduzido de um conjunto passa
          de 1, ε é multiplicada por √χ²ᵣ, para refletir a dispersão real (ruído correlacionado, sistemáticos
          entre detetores) e não apenas as barras de erro declaradas.
        </p>
        <ul>
          <li>Uma banda só é avaliada com pelo menos <strong>{PARAMETROS.minPontosBanda} pontos</strong> dentro e <strong>{PARAMETROS.minPontosContinuo} pontos</strong> de contínuo.</li>
          <li>
            <strong>Erro mínimo:</strong> nenhum ponto entra no cálculo com erro inferior a {PARAMETROS.fatorErroMinimo} × a
            mediana dos erros locais. Sem isto, um único ponto com barra de erro anómala pode dominar a média
            ponderada e criar uma deteção espúria. Os pontos afetados são indicados na inspeção de banda.
          </li>
          <li>Excessos negativos indicam uma banda menos profunda do que o contínuo, o oposto de absorção.</li>
          <li>
            O contínuo só exclui as bandas da própria espécie. Excluir as bandas de todas as espécies deixa, com
            uma base alargada, quase nenhum contínuo entre 1 e 5 µm; testado contra as espécies reportadas
            nos artigos, a exclusão por espécie acerta mais. O preço é que absorção de outras moléculas no
            contínuo pode reduzir o σ medido.
          </li>
        </ul>

        <h2>Regras de decisão</h2>
        <p>O motor em Prolog decide em três passagens.</p>
        <p><strong>1. Estado de cada espécie</strong>, a partir dos σ das suas bandas:</p>
        <ul>
          <li><strong>Detetada:</strong> pelo menos uma banda ≥ 5σ e, se a espécie tiver mais de uma banda coberta, outra banda ≥ 3σ.</li>
          <li><strong>Tentativa:</strong> pelo menos uma banda ≥ 3σ, sem cumprir o critério anterior.</li>
          <li><strong>Indício:</strong> pelo menos uma banda entre 2σ e 3σ. Compatível com absorção, insuficiente para afirmar; não conta como deteção.</li>
          <li><strong>Não detetada:</strong> há bandas cobertas, mas nenhuma chega a 2σ.</li>
          <li><strong>Fora do espectro:</strong> nenhuma banda tem pontos suficientes. Nada se conclui.</li>
        </ul>
        <p><strong>2. Contexto do alvo.</strong> Se a estrela tiver R★ &lt; 0,6 R☉ (anã M) e todo o sinal de uma espécie
          estiver abaixo de 3 µm, o estado baixa um nível: manchas e fáculas não ocultadas imprimem bandas de água e
          alcalinos que imitam a atmosfera do planeta.</p>
        <p><strong>3. Alertas sobre o conjunto:</strong></p>
        <ul>
          <li>Uma banda ≤ −3σ (bem abaixo do contínuo) indica contínuo contaminado por absorção de outra espécie nos flancos, ou um sistemático; o alerta diz qual.</li>
          <li>Quando todo o sinal de uma espécie está em bandas partilhadas com outra espécie já detetada, o alerta diz que essa espécie pode explicar o excesso.</li>
        </ul>
        <p>Cada conclusão indica o que faltaria para subir de nível (por exemplo, uma segunda banda ≥ 3σ).</p>
        <p>
          <strong>Comparação com a literatura.</strong> Quando o planeta tem espécies reportadas em artigos, cada conclusão é
          comparada com elas. Se o espectro só cobre bandas fracas de uma espécie (como a do CO₂ a 2,0 µm), a espécie conta
          como fora do alcance, não como falha. Os limiares estão em <code>engine/rules/detecao.pl</code> e as janelas em{" "}
          <code>engine/seed.pl</code>.
        </p>

        <h2>Identificação do planeta</h2>
        <p>
          Os ficheiros não trazem o nome do planeta. O motor combina o hash do conteúdo (deteta reenvios), o nome
          sugerido a partir do nome do ficheiro, a compatibilidade dos raios R★ e Rp com cada planeta da base
          (z &lt; 3, com os erros somados em quadratura) e a referência dos parâmetros estelares. Só declara um
          planeta conhecido quando nome e raios concordam. Nos casos ambíguos, a decisão é do utilizador.
        </p>

        <h2>Limitações conhecidas</h2>
        <ul>
          <li>Bandas largas e sobrepostas (H₂O, CH₄, CO₂) contaminam o contínuo local e reduzem o σ medido.</li>
          <li>As janelas de SO₂, CO₂ e CO são vizinhas e deixam pouco contínuo à volta do CO₂.</li>
          <li>Em estrelas ativas, em particular anãs M, manchas e fáculas não ocultadas podem imprimir declives e bandas no espectro de transmissão.</li>
          <li>O sistema só procura espécies presentes na base de conhecimento.</li>
          <li>
            Bandas que se sobrepõem (NH₃, HCN e C₂H₂ perto de 3 µm; SO₂ e SiO perto de 4 µm) dão o mesmo
            excesso a várias espécies. A explicação assinala estes casos; só bandas noutras regiões, como as do
            infravermelho médio, os distinguem.
          </li>
        </ul>
      </article>
    </main>
  );
}
