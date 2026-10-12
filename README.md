# Spectra - Espectros de trânsito: sistema especialista

Carregas um espectro de transmissão de um exoplaneta (CSV do [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/cgi-bin/atmospheres/nph-firefly?atmospheres)) e o
sistema diz a que planeta corresponde, que espécies químicas têm assinatura no espectro e
porquê. O raciocínio corre num motor de inferência em **SWI-Prolog**. A interface e a parte
numérica correm em **Next.js**.

Faz parte do trabalho de tese Spectra e serve de referência simbólica, rápida e explicável. Não é
um retrieval atmosférico: ver [Limitações](#limitações-conhecidas).

## Índice

- [Arranque rápido](#arranque-rápido)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Desenvolvimento sem Docker](#desenvolvimento-sem-docker)
- [Onde mexer para mudar o quê](#onde-mexer-para-mudar-o-quê)
- [Como o sistema decide](#como-o-sistema-decide)
- [Avaliar o motor contra a literatura](#avaliar-o-motor-contra-a-literatura)
- [Dados](#dados)
- [Cópias de segurança](#cópias-de-segurança)
- [API do motor](#api-do-motor)
- [Resolução de problemas](#resolução-de-problemas)
- [Limitações conhecidas](#limitações-conhecidas)

## Arranque rápido

Pré-requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS)
ou Docker Engine com o plugin Compose (Linux).

```bash
git clone <url-do-repositório>
cd spectra
docker compose up --build
```

- Interface: <http://localhost:3000>
- Motor, para depuração: <http://localhost:8080/base>

Na primeira execução, a base de conhecimento é criada a partir de `engine/seed.pl`: 6 planetas,
14 espécies químicas com 29 bandas e as espécies reportadas nos artigos. Tudo o que fizeres
depois (planetas novos, espectros carregados) fica guardado em volumes do Docker e sobrevive a
reinícios.

```bash
docker compose down      # pára, mantém os dados
docker compose down -v   # pára e APAGA a base e os espectros guardados
```

## Estrutura do projeto

```
spectra/
├─ docker-compose.yml       dois serviços (engine, web) e dois volumes
├─ dados/                   espectros de exemplo (NASA Exoplanet Archive)
├─ ferramentas/
│  └─ tbl_para_csv.py       converte tabelas IPAC (.tbl) do arquivo em CSV
├─ engine/                  motor de inferência (SWI-Prolog)
│  ├─ server.pl             servidor HTTP/JSON
│  ├─ kb.pl                 base de conhecimento persistente e migração do seed
│  ├─ seed.pl               conhecimento inicial: planetas, espécies, bandas, literatura
│  └─ rules/
│     ├─ identificacao.pl   a que planeta pertence um espectro
│     └─ detecao.pl         estado de cada espécie, contexto, alertas, comparação
└─ web/                     interface e camada numérica (Next.js 15, React 19, JavaScript)
   ├─ app/                  páginas (Analisar, Base, Planeta, Método) e rotas /api
   ├─ components/           espectro, régua de σ, inspeção de banda, …
   ├─ lib/
   │  ├─ parse.js           lê e limpa o CSV
   │  ├─ features.js        excesso de profundidade por banda, em σ
   │  ├─ pipeline.js        orquestra parse → features → motor
   │  ├─ armazem.js         guarda os CSVs originais
   │  └─ engine.js          cliente HTTP do motor
   └─ scripts/              testar.js e avaliar.js (linha de comandos)
```

O Prolog nunca vê o espectro. A camada web mede o σ de cada banda e envia ao motor só factos
`m(Banda, Coberta, Sigma)` e os raios. O motor decide a partir deles e devolve a explicação.

## Desenvolvimento sem Docker

Pré-requisitos: **SWI-Prolog 9** ([download](https://www.swi-prolog.org/download/stable)) e
**Node.js 20 ou superior**.

Dois terminais, a partir da raiz do projeto.

**Motor** (porta 8080; a base fica em `engine/data/kb.journal`):

```bash
cd engine
swipl server.pl
```

**Interface** (porta 3000):

```bash
cd web
npm install
npm run dev
```

Sem variáveis de ambiente, a interface procura o motor em `http://localhost:8080` e guarda os
CSVs em `web/data/espectros`.

### Variáveis de ambiente

| Variável     | Serviço | Por defeito (local)       | No Docker                   |
|--------------|---------|---------------------------|-----------------------------|
| `PORT`       | engine  | `8080`                    | `8080`                      |
| `KB_PATH`    | engine  | `data/kb.journal`         | `/data/kb.journal`          |
| `ENGINE_URL` | web     | `http://localhost:8080`   | `http://engine:8080`        |
| `DATA_DIR`   | web     | `web/data/espectros`      | `/data/espectros`           |

No PowerShell define-se assim: `$env:ENGINE_URL="http://localhost:8080"; npm run avaliar -- ../dados`.
Em bash: `ENGINE_URL=http://localhost:8080 npm run avaliar -- ../dados`.

## Onde mexer para mudar o quê

| Quero…                                         | Ficheiro                                        |
|------------------------------------------------|-------------------------------------------------|
| acrescentar uma espécie ou uma banda           | `engine/seed.pl` (e subir `versao_seed`) ou a página Base |
| registar o que um artigo reporta               | `engine/seed.pl` (`seed_reportada/3`) ou a página do planeta |
| mudar limiares (5σ, 3σ, 2σ) ou regras          | `engine/rules/detecao.pl`                       |
| mudar como se identifica o planeta             | `engine/rules/identificacao.pl`                 |
| mudar como se mede o σ (contínuo, erro mínimo) | `PARAMETROS` em `web/lib/features.js`           |
| aceitar outro formato de ficheiro              | `web/lib/parse.js`                              |
| mudar o aspeto                                 | `web/app/globals.css` e `web/components/`       |

### Duas armadilhas da base persistente

- **O seed só acrescenta.** Ao subir `versao_seed`, uma base existente recebe as espécies,
  bandas e planetas que lhe faltam, identificados pelo id. Se **alterares** uma banda que já
  existe (por exemplo, a janela de `co2_43`), as bases antigas ficam com a versão anterior. Para
  aplicar a alteração: `docker compose down -v` (perdes os dados) ou dá um id novo à banda.
- **As declarações `:- persistent` em `kb.pl` definem o formato do journal.** Mudar a aridade ou
  os tipos de `planeta/7`, `observacao/6`, etc. torna os journals existentes ilegíveis. Acrescentar
  predicados persistentes novos não causa problemas.

## Como o sistema decide

### Identificação do planeta

Os CSVs não trazem o nome do planeta. O motor combina várias pistas: o hash do conteúdo, o nome
sugerido a partir do nome do ficheiro (`table_<Planeta>-<Autor>-et-al_-<ano>.csv`), a
compatibilidade dos raios R★ e Rp (z < 3) e a referência estelar.

| Decisão     | O que acontece                                                   |
|-------------|------------------------------------------------------------------|
| `duplicado` | O mesmo espectro já foi carregado. Nada é gravado.               |
| `existe`    | Nome e raios concordam. O espectro é associado ao planeta.       |
| `ambiguo`   | As pistas não chegam. O utilizador escolhe ou cria um planeta.   |
| `novo`      | Não há candidatos. O utilizador confirma e o planeta é criado.   |

O sistema nunca cria planetas sem confirmação.

### Excesso por banda (camada numérica)

Para cada banda, a média ponderada da profundidade dentro da janela é comparada com o contínuo
local: janelas da mesma largura de cada lado, sem os pontos de outras bandas da mesma espécie.

    σ = (D̄_banda − D̄_contínuo) / √(ε²_banda + ε²_contínuo)

- Se o χ² reduzido de um conjunto for maior que 1, a incerteza é multiplicada por √χ²ᵣ.
- **Erro mínimo:** nenhum ponto entra com erro inferior a 0,5 × a mediana dos erros locais, para
  que um ponto com uma barra de erro anómala não domine a média.
- O contínuo exclui só as bandas da própria espécie. Excluir as de todas as espécies deixa quase
  nenhum contínuo entre 1 e 5 µm; contra a literatura, a exclusão por espécie acerta mais.

### Estado de cada espécie (motor de inferência)

O motor (`engine/rules/detecao.pl`) decide em três passagens:

1. **Estado** a partir dos σ: `detetada` (≥ 5σ, corroborada quando há mais de uma banda
   coberta), `tentativa` (≥ 3σ), `indicio` (2–3σ), `nao_detetada` ou `sem_cobertura`.
2. **Contexto do alvo:** em anãs M (R★ < 0,6 R☉), um sinal que só existe abaixo de 3 µm baixa um
   nível, porque manchas e fáculas não ocultadas imitam bandas de água e alcalinos.
3. **Alertas:** bandas ≤ −3σ (contínuo contaminado por outra espécie, ou sistemático) e sinais que
   uma espécie já detetada pode explicar.

Cada conclusão traz a regra aplicada, o motivo, os alertas e o que faltaria para subir de nível.
As conclusões **não são gravadas**: recalculam-se em cada análise. Quando o planeta tem espécies
reportadas, cada conclusão é comparada com a literatura. Uma espécie de que o espectro só cobre
bandas fracas conta como "fora do alcance", não como falha.

A página **Método** da aplicação explica o mesmo a quem usa o sistema.

## Avaliar o motor contra a literatura

Com o motor a correr (Docker ou local):

```bash
cd web
npm install
ENGINE_URL=http://localhost:8080 npm run avaliar -- ../dados
```

No PowerShell: `$env:ENGINE_URL="http://localhost:8080"; npm run avaliar -- ../dados`. Os scripts
aceitam uma pasta, ficheiros soltos ou padrões como `../dados/*.csv`.

Para cada CSV, o script compara as conclusões com as espécies reportadas e termina com um
resumo. Com os seis espectros de `dados/`, a versão atual deteta 4 de 9 espécies reportadas
avaliáveis, sem falsos positivos. Corre-o antes e depois de mudar regras ou parâmetros.

`npm run testar -- ../dados` mostra o pipeline completo de cada ficheiro: identificação,
avisos do parser e σ de cada banda.

## Dados

- **Formato aceite:** CSV (`;` ou `,`) da tabela de espectroscopia atmosférica do
  [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/), com pelo menos
  `CENTRALWAVELNG`, `PL_TRANDEP` e `PL_TRANDEPERR1`.
- **Ficheiros `.tbl` (formato IPAC):** converter primeiro com
  `python ferramentas/tbl_para_csv.py <pasta>`. Os CSVs ficam na subpasta `csv`. Usa o astropy
  se estiver instalado; caso contrário, um leitor incluído no script.
- **Não abrir os CSVs no Excel antes de os carregar:** o Excel converte números como `1.07` em
  datas. O parser recupera esse caso e avisa, mas é melhor evitá-lo.
- **`dados/`** traz seis espectros publicados em 2026, tal como foram descarregados. O do
  WASP-96 b tem de propósito o `ST_RAD` convertido em data pelo Excel, para exercitar o parser.
  Ao usar estes dados em trabalho científico, cita os artigos de origem e o NASA Exoplanet Archive.

## Cópias de segurança

A base e os espectros vivem na pasta `backup/` (`backup/kb.journal` e `backup/espectros/`), montada
diretamente nos containers. Os dados são lidos de lá no arranque e gravados lá em tempo real, por
isso não há passo de restauro: basta `docker compose up -d`. A pasta fica fora do git
(`*.journal` está no `.gitignore`), por isso copia-a para onde quiseres guardar o backup.

Se tinhas dados nos antigos volumes `kb-data` / `espectros-data`, copia-os uma vez para a pasta
antes de arrancar:

```bash
docker compose cp engine:/data/kb.journal ./backup/kb.journal
docker compose cp web:/data/espectros ./backup/
```

Conhecimento que deva acompanhar o código (planetas, espécies reportadas) deve passar para o
`seed.pl`.

## API do motor

Todos os pedidos e respostas são JSON. Erros: `{"erro": "..."}` com o código HTTP adequado.

| Método | Caminho        | Entrada                                                          |
|--------|----------------|------------------------------------------------------------------|
| GET    | `/health`      | —                                                                |
| GET    | `/base`        | — (planetas, espécies, bandas, reportadas)                       |
| GET    | `/planeta`     | `?id=` (nome ou id): parâmetros, espectros e reportadas          |
| POST   | `/decidir`     | `hash, nome, rs, ers, rp, erp, ref`                              |
| POST   | `/inferir`     | `medidas: [{banda, coberta, sigma}], planeta?, rs?`              |
| POST   | `/planetas`    | `nome, rs, ers, rp, erp, ref`                                    |
| POST   | `/observacoes` | `hash, planeta, autores, ficheiro, lmin, lmax`                   |
| POST   | `/especies`    | `nome, id?, bandas: [{lmin, lmax, id?}]`                         |
| POST   | `/reportadas`  | `planeta, especie, fonte`                                        |

Os ids de planeta são o nome sem pontuação, em minúsculas: `WASP-96 b` → `wasp96b`.

## Resolução de problemas

| Sintoma | Causa provável e solução |
|---|---|
| "O motor de inferência não está acessível" | O motor não arrancou ou `ENGINE_URL` está errado. Ver `docker compose logs engine`. |
| Porta 3000 ou 8080 ocupada | Mudar o lado esquerdo do mapeamento em `docker-compose.yml` (ex.: `"3001:3000"`). |
| "Ficheiro não guardado" na página do planeta | O espectro foi carregado antes de existir o armazenamento. Carregá-lo de novo uma vez. |
| Uma banda alterada no `seed.pl` não muda nada | O seed só acrescenta. Ver [armadilhas](#duas-armadilhas-da-base-persistente). |
| O motor não arranca depois de mudar `kb.pl` | Formato do journal alterado. `docker compose down -v` (apaga os dados). |
| Tipos de letra diferentes do esperado | As fontes vêm do Google Fonts; sem internet usa-se uma alternativa do sistema. |
| Um planeta aparece sempre como "ambíguo" | Outro planeta da base tem raios compatíveis. Confirmar os parâmetros dos dois. |

## Limitações conhecidas

- **Não é um retrieval atmosférico.** A deteção compara cada banda com o contínuo vizinho; não há
  modelo de transferência radiativa, abundâncias ou temperaturas. Sinais fracos detetados nos
  artigos por retrieval podem ficar abaixo dos limiares (por exemplo, o CO₂ do HAT-P-30 b fica em
  "indício", a 2,4σ).
- **Bandas largas e sobrepostas** contaminam o contínuo e reduzem o σ. NH₃, HCN e C₂H₂ partilham a
  banda de 3 µm; SO₂ e SiO partilham a de 4 µm. Só as bandas do infravermelho médio as distinguem.
- **As janelas espectrais são aproximadas.** Confirmar com HITRAN ou ExoMol antes de uso científico.
- **O sistema só procura espécies que estejam na base de conhecimento.**
- **Não há autenticação.** Qualquer pessoa com acesso à interface ou à porta 8080 pode escrever na
  base. Não expor publicamente sem proteger o motor (por exemplo, com um segredo partilhado) e a
  interface.