---
name: better-vault
description: Protocolo operacional completo para Agentes de IA consultarem e catalogarem conhecimentos no BetterVault usando a arquitetura de 3 Estruturas (O Bibliotecário -> A Biblioteca e as Capas -> O Livro Aberto), economizando ~98% de tokens de contexto.
---

# SKILL: BetterVault — Operação Autônoma da Biblioteca em 3 Estruturas

Use esta Skill sempre que precisar **consultar conhecimentos existentes**, **guardar novos materiais** (código-fonte, repositórios GitHub, livros/PDFs, vídeos com timestamps ou galerias de fotos/referências visuais) ou **auditar/manter** uma instância do **BetterVault**.

---

## 1. Visão Geral e Regra de Ouro das 3 Estruturas

O **BetterVault** organiza qualquer acervo técnico ou criativo em **3 Estruturas Simples** para impedir o estouro da janela de contexto do agente e garantir precisão amigável para humanos:

1. **Estrutura 1 — O Bibliotecário (`INDICE_MASTER.md` + `bibliotecario.py` + `catalogo.json`)**
   - Porta de entrada única do repositório. Lista todas as estantes (`categorias/<slug>.md`), o mapa rápido de Capas e executa buscas determinísticas em português em `< 5 ms`.
2. **Estrutura 2 — A Biblioteca e as Capas (`categorias/<slug>.md` + `capas/LIV-NNN_<slug>.md`)**
   - Cada item catalogado possui uma **Capa Markdown leve (~200 a 500 tokens)**.
   - Contém a explicação leiga de 1 frase (`explicacao_leiga`), a **Síntese Executiva** (bullets densos que respondem ~80% das dúvidas sem abrir arquivos brutos) e o **Sumário de Coordenadas** (tabela com o arquivo/capítulo/minuto exato).
3. **Estrutura 3 — O Livro Aberto (`livros_abertos/LIV-NNN/`)**
   - Diretório onde ficam armazenados os arquivos pesados ou completos daquele item (scripts `.py`/`.js`/`.ts`, documentos longos, capítulos de PDF/livros, mapas de vídeo ou imagens `.svg`/`.png`).

### Regra de Ouro (Inviolável para Agentes de IA)
> **PROIBIDO varrer `livros_abertos/` às cegas (`grep -R`, `glob` irrestrito ou leitura sequencial de múltiplos arquivos brutos).**
> Siga SEMPRE a rota cirúrgica de **3 Saltos**:
> - **Rota via CLI (`< 5 ms`):** `python bibliotecario.py buscar "<termo>"` $\rightarrow$ ler apenas a Capa vencedora `capas/LIV-NNN_*.md` $\rightarrow$ se necessário, ler apenas o arquivo/intervalo de linhas indicado no `Sumário de Coordenadas`.
> - **Rota via Navegação Markdown:** Ler `INDICE_MASTER.md` $\rightarrow$ abrir a estante `categorias/<categoria>.md` $\rightarrow$ abrir a Capa `capas/LIV-NNN_*.md` $\rightarrow$ abrir cirurgicamente o alvo em `livros_abertos/LIV-NNN/<arquivo>`.

---

## 2. Protocolo Passo a Passo de Consulta e Abertura Cirúrgica

Quando o usuário pedir informações sobre um tema ou você precisar verificar se já existe padrão/código salvo na biblioteca:

### Passo 1 — Busca Instantânea (`< 5 ms`)
Execute no diretório raiz da biblioteca:
```bash
python bibliotecario.py buscar "<palavras-chave sem pontuação desnecessária>"
```
O comando retorna o ranking de Capas ordenado por escore, o caminho da Capa (`capas/LIV-NNN_*.md`), a economia de tokens e a **Coordenada Recomendada** (`Ir Direto ao Ponto`).

*(Alternativa sem terminal)*: Leia `INDICE_MASTER.md` (~250 tokens) e identifique qual estante (`categorias/<slug>.md`) ou qual Capa (`capas/LIV-NNN_*.md`) trata do assunto.

### Passo 2 — Leitura da Capa (~200 a 500 tokens)
Abra o arquivo `capas/LIV-NNN_<slug>.md` retornado no topo da busca e examine:
1. `## Síntese Executiva (Conhecimento Rápido na Capa)`
2. `## Sumário de Coordenadas (Onde Abrir no Livro Aberto)`

### Passo 3 — Decisão de Parada ou Abertura Cirúrgica
- **Pare na Capa (80% dos casos):** Se a `Síntese Executiva` já responder à pergunta (regras arquiteturais, parâmetros, comandos, limites numéricos), responda imediatamente sem tocar em `livros_abertos/`.
- **Abertura Cirúrgica (20% dos casos):** Se precisar copiar um trecho de código, inspecionar uma implementação exata ou ler um capítulo específico, olhe a coluna `Alvo Exato` na tabela `Sumário de Coordenadas` (ex.: `motor.js:10-32`) e leia **apenas** `livros_abertos/LIV-NNN/motor.js` nas linhas `10` a `32`.

---

## 3. Protocolo Passo a Passo de Catalogação (Guardar Novo Conhecimento)

Sempre que o usuário pedir para guardar, documentar ou catalogar um novo material na biblioteca, escolha **uma das 3 opções oficiais abaixo**.

> **Nota sobre Estantes (Categorias):**
> O BetterVault vem com 3 estantes iniciais (`engenharia-e-codigo`, `midia-e-motion`, `referencias-e-livros`), mas **você pode criar qualquer estante nova** passando um novo slug em `--categoria` e o título legível em `--nome-categoria` (ex.: `--categoria "financas-e-negocios" --nome-categoria "Finanças & Negócios"`). O comando `sincronizar` descobre e cria automaticamente o sub-índice da nova estante!

---

### Opção A — Catalogação em 1 Comando via CLI (`python bibliotecario.py catalogar`)

É a forma mais rápida e segura: cria a pasta em `livros_abertos/LIV-NNN/`, copia arquivos reais (`--arquivo-origem`) ou grava o arquivo de conteúdo (`--nome-arquivo` + `--conteudo-arquivo`), gera a Capa Markdown padronizada em `capas/` e roda a sincronização completa automaticamente. Se `--id` for omitido, calcula automaticamente o próximo `LIV-NNN`.

#### Exemplo A.1 — Código-Fonte (`codigo-fonte`) copiando arquivos reais do computador
```bash
python bibliotecario.py catalogar \
  --titulo "Motor de Animação Determinística em GSAP" \
  --subtitulo "Renderização frame a frame com função pura renderAt(t)" \
  --explicacao-leiga "Pacote de código para animar personagens web sem engasgos e exportar vídeo com precisão." \
  --categoria "engenharia-e-codigo" \
  --tipo "codigo-fonte" \
  --tempo-capa "1 min" \
  --tempo-completo "Projeto com 2 arquivos" \
  --tags "gsap,animacao,svg,renderat,javascript" \
  --gatilhos "animar personagem svg sem tremer; exportar animacao gsap frame a frame" \
  --resumo $'Usa gsap.ticker.remove(gsap.updateRoot) para desligar o relógio global.\nExige transformOrigin explícito em cada junta SVG.' \
  --coordenada "Função renderAt|motor_gsap.js:10-32|codigo|Loop determinístico de captura de quadros" \
  --coordenada "Rigging SVG|rig_personagem.svg:1-25|imagem|Estrutura de grupos e pivôs fixos" \
  --arquivo-origem "./caminho/para/motor_gsap.js" \
  --arquivo-origem "./caminho/para/rig_personagem.svg"
```

#### Exemplo A.2 — Repositório GitHub (`github-repo`)
```bash
python bibliotecario.py catalogar \
  --titulo "Orquestrador Multi-Agente com Controle de Orçamento" \
  --subtitulo "Repositório TypeScript/Python com disjuntor de gastos e leitura rápida de disco" \
  --explicacao-leiga "Repositório que coordena vários assistentes de IA impedindo gastos excessivos." \
  --categoria "engenharia-e-codigo" \
  --tipo "github-repo" \
  --tempo-capa "1 min" \
  --tempo-completo "Repositório com 3 arquivos" \
  --tags "github,agentes,orcamento,scandir,typescript" \
  --gatilhos "controlar custos de api em enxame de agentes; ler pastas grandes no windows rapido" \
  --resumo $'Aborta chamadas em cascata ao detectar erro HTTP 401/403.\nUsa os.scandir() no Windows para ler metadados em menos de 15 ms.' \
  --coordenada "Disjuntor de Orçamento|orquestrador.ts:12-48|codigo|Trava de segurança por limite em dólares" \
  --coordenada "Mapa do Repositório|GITHUB_REPO.md:1-30|doc|Links oficiais, branch principal e comandos de clone" \
  --nome-arquivo "GITHUB_REPO.md" \
  --conteudo-arquivo $'# Repositório Oficial\n\n- URL: https://github.com/exemplo/orquestrador\n- Branch: main'
```

#### Exemplo A.3 — Livro Digital ou PDF (`pdf-livro`)
```bash
python bibliotecario.py catalogar \
  --titulo "Arquitetura de Memória enxuta para Agentes de IA" \
  --subtitulo "Livro dividido por capítulos sobre organização em 3 camadas" \
  --explicacao-leiga "Livro que ensina como organizar pastas e resumos para que a IA encontre tudo rápido." \
  --categoria "referencias-e-livros" \
  --tipo "pdf-livro" \
  --tempo-capa "1 min" \
  --tempo-completo "68 páginas" \
  --tags "livro,pdf,memoria,contexto,arquitetura" \
  --gatilhos "organizar documentos para ia ler rapido; evitar estouro de tokens em pdf grande" \
  --resumo $'Separa o acervo em Índice Master, Capas de 1 minuto e Livro Aberto.\nReduz o consumo de contexto em até 98% nas consultas rotineiras.' \
  --coordenada "A Regra das 3 Camadas|Cap. 1, p. 1-18|pdf|Por que separar a Capa do arquivo bruto" \
  --coordenada "Tabelas de Coordenadas|Cap. 2, p. 19-34|pdf|Como mapear páginas exatas para leitura cirúrgica" \
  --nome-arquivo "LIVRO_COMPLETO.md" \
  --conteudo-arquivo $'# Capítulo 1 (p. 1-18)\nTexto do capítulo 1...\n\n# Capítulo 2 (p. 19-34)\nTexto do capítulo 2...'
```

#### Exemplo A.4 — Aula em Vídeo com Timestamps (`video`)
```bash
python bibliotecario.py catalogar \
  --titulo "Masterclass de Edição Vertical 9:16 e Áudio -14 LUFS" \
  --subtitulo "Aula em vídeo com mapa de minutos e script FFmpeg" \
  --explicacao-leiga "Aula em vídeo mostrando como cortar vídeos para celular e nivelar o volume da voz." \
  --categoria "midia-e-motion" \
  --tipo "video" \
  --tempo-capa "1 min" \
  --tempo-completo "14 min de vídeo" \
  --tags "video,ffmpeg,lufs,vertical,reels,audio" \
  --gatilhos "normalizar volume de video para redes sociais; cortar silencio no ffmpeg" \
  --resumo $'Normaliza a voz em -14.0 LUFS com pico verdadeiro em -1.0 dBTP.\nCorta pausas maiores que 0,43 s preservando fôlego natural.' \
  --coordenada "Enquadramento 9:16|01:12-02:05|video|Zona segura de legendas para Reels e TikTok" \
  --coordenada "Normalização LUFS|02:30-06:10|video|Filtro loudnorm em duas passadas no FFmpeg" \
  --nome-arquivo "TIMESTAMPS_VIDEO.md" \
  --conteudo-arquivo $'# Mapa de Capítulos do Vídeo\n\n- **01:12 - 02:05:** Enquadramento Vertical 9:16\n- **02:30 - 06:10:** Normalização de Áudio -14 LUFS'
```

#### Exemplo A.5 — Galeria de Fotos e Referências Visuais (`fotos-ref`)
```bash
python bibliotecario.py catalogar \
  --titulo "Direção de Arte Editorial em Papel Quente" \
  --subtitulo "Galeria de referências visuais, paleta de cores e tipografia" \
  --explicacao-leiga "Álbum visual com as cores de papel creme, fontes de leitura e layout em 3 colunas." \
  --categoria "midia-e-motion" \
  --tipo "fotos-ref" \
  --tempo-capa "1 min" \
  --tempo-completo "Galeria com 3 pranchas" \
  --tags "design,cores,tipografia,galeria,ui,svg" \
  --gatilhos "escolher paleta de cores confortavel para leitura; layout de 3 colunas editorial" \
  --resumo $'Usa fundo creme (#FBF8F3) e cartões claros (#F3EDE2) para conforto ocular.\nCombina títulos serifados (Newsreader) com corpo Plus Jakarta Sans.' \
  --coordenada "Paleta Editorial|Pranchas 1-3|imagem|Amostras de contraste AAA em papel quente" \
  --coordenada "Wireframe 3 Colunas|layout_3colunas.svg:1-40|imagem|Diagrama vetorial das 3 regiões da interface" \
  --nome-arquivo "GUIA_PALETA_PRANCHAS.md" \
  --conteudo-arquivo $'# Pranchas 1 a 3 — Direção de Arte\n\n- Fundo principal: `#FBF8F3`\n- Destaque terracota: `#B8502B`'
```

---

### Opção B — Criação Direta de Arquivos (Markdown + Pasta + `sincronizar`)

Você também pode criar diretamente a pasta do Livro Aberto e o arquivo da Capa usando sua ferramenta de escrita de arquivos (sempre em **UTF-8 sem BOM e fim de linha LF**):

1. **Descubra o próximo ID livre:** Olhe a pasta `capas/` e `livros_abertos/` (se estiver vazia, comece em `LIV-001`).
2. **Crie a pasta do Livro Aberto:** `livros_abertos/LIV-NNN/` e grave lá dentro os arquivos completos (`.py`, `.js`, `.md`, `.svg`, etc.).
3. **Crie a Capa Markdown:** `capas/LIV-NNN_<slug-curto>.md` seguindo **exatamente** este template de frontmatter YAML e seções:

```markdown
---
id: LIV-001
titulo: "Título Claro e Direto do Material"
subtitulo: "Subtítulo explicando o foco prático"
explicacao_leiga: "Frase simples em português claro dizendo para que este material serve a qualquer pessoa."
tempo_leitura_capa: "1 min"
tempo_material_completo: "Projeto com 3 arquivos"
categoria: engenharia-e-codigo
nome_categoria: "Engenharia & Código"
tipo_principal: codigo-fonte
cor_capa: "#10b981"
tags: ["tag1", "tag2", "tag3"]
gatilhos:
  - "frase natural de quando consultar este material"
  - "segunda situacao ou problema que este livro resolve"
tokens_livro_aberto_est: 12000
---

# Capa LIV-001 — Título Claro e Direto do Material

## Síntese Executiva (Conhecimento Rápido na Capa)
- **Decisão ou Regra Principal:** Explicação direta com os valores, fórmulas ou comandos essenciais.
- **Segundo Ponto-Chave:** O que evitar, como configurar e qual o ganho prático obtido.
- **Terceiro Ponto-Chave:** Resumo complementar para que 80% das consultas terminem aqui na Capa.

## Sumário de Coordenadas (Onde Abrir no Livro Aberto)
| Rótulo | Alvo Exato | Tipo | Resumo da Coordenada |
|---|---|---|---|
| Nome da Função ou Seção | `arquivo.py:10-45` | `codigo` | O que este trecho específico implementa |
| Capítulo ou Guia | `Cap. 2, p. 19-34` | `pdf` | O que estas páginas explicam em detalhe |
```

4. **Sincronize obrigatoriamente o Bibliotecário:**
```bash
python bibliotecario.py sincronizar
```

---

### Opção C — Via API HTTP Local (`POST /api/guardar`)

Se o servidor estiver ativo (`python bibliotecario.py servir --porta 4325`), você ou qualquer integração pode enviar um `POST` para `http://127.0.0.1:4325/api/guardar`:

```json
{
  "titulo": "Guia Prático de Automação",
  "subtitulo": "Scripts rápidos e seguros",
  "explicacao_leiga": "Ensina a automatizar tarefas repetitivas com segurança.",
  "categoria": "engenharia-e-codigo",
  "nome_categoria": "Engenharia & Código",
  "tipo_principal": "codigo-fonte",
  "tempo_leitura_capa": "1 min",
  "tempo_material_completo": "Projeto com 1 arquivo",
  "tags": ["automacao", "python", "scripts"],
  "gatilhos": ["automatizar tarefa repetitiva", "criar script seguro"],
  "resumo_capa": [
    "Valida entradas antes de mover arquivos.",
    "Gera log determinístico em UTF-8 LF."
  ],
  "coordenadas": [
    {
      "rotulo": "Função Principal",
      "alvo": "automacao.py:1-30",
      "tipo": "codigo",
      "resumo": "Fluxo completo de execução e log"
    }
  ],
  "nome_arquivo": "automacao.py",
  "conteudo_arquivo": "def executar():\n    print('Automacao concluida!')\n"
}
```

---

## 4. Padrões de Coordenadas por Tipo de Mídia (`Alvo Exato`)

Para que o tradutor automático `traduzir_onde_amigavel()` e o Leitor Cirúrgico da interface web destaquem automaticamente as linhas, páginas ou minutos ao clicar em **"Ir Direto ao Ponto"**, escreva a coluna `Alvo Exato` seguindo um destes formatos padronizados:

| Tipo de Mídia (`Tipo`) | Formato de `Alvo Exato` na Capa | Tradução Automática (`onde_amigavel`) | Comportamento no Leitor Visual |
|---|---|---|---|
| `codigo` | `motor.js:10-32` | `Código · Linhas 10 a 32` | Abre `motor.js`, rola até a linha 10 e destaca as linhas 10 a 32 |
| `doc` | `GUIA.md:5-28` | `Documento · Linhas 5 a 28` | Abre `GUIA.md`, rola até a linha 5 e destaca as linhas 5 a 28 |
| `doc` | `GUIA.md:Cap. 1-2` | `Guia · Capítulos 1 a 2` | Abre `GUIA.md` e destaca o bloco dos Capítulos 1 a 2 |
| `pdf` | `Cap. 2, p. 19-34` | `Capítulo 2 · Págs. 19 a 34` | Abre o livro/PDF e destaca a seção correspondente ao Capítulo 2 / páginas 19–34 |
| `pdf` | `p. 19-34` ou `Pág. 12` | `Livro · Págs. 19 a 34` / `Livro · Página 12` | Abre o documento paginado na página indicada |
| `video` | `01:12-02:05` | `Vídeo · Minuto 01:12 a 02:05` | Abre o mapa do vídeo e destaca a faixa de tempo `01:12` a `02:05` |
| `video` | `Minuto 02:30` | `Vídeo · Minuto 02:30` | Abre o mapa do vídeo direto no minuto `02:30` |
| `imagem` | `Pranchas 1-3` | `Galeria · Pranchas 1 a 3` | Abre o guia da galeria visual nas pranchas 1 a 3 |
| `imagem` | `diagrama.svg:1-45` | `Ilustração · Linhas 1 a 45` | Renderiza a ilustração SVG + código vetorial destacado |

### Valores aceitos para `tipo_principal` na Capa
- `codigo-fonte` (Verde `#10b981`)
- `github-repo` (Índigo `#6366f1`)
- `video` (Âmbar `#f59e0b`)
- `fotos-ref` (Rosa `#ec4899`)
- `pdf-livro` (Azul `#0ea5e9`)
- `pacote-misto` (Roxo `#8b5cf6`)

---

## 5. Checklist de Verificação e Manutenção

Sempre que adicionar, editar ou reorganizar qualquer Capa ou Livro Aberto no BetterVault, execute os dois comandos abaixo antes de encerrar sua tarefa:

```bash
# 1. Regenera categorias/*.md, INDICE_MASTER.md e catalogo.json (e normaliza UTF-8 LF)
python bibliotecario.py sincronizar

# 2. Executa a suíte de autoteste (schema, tradutor de coordenadas, teste E2E de busca < 10 ms e auditoria UTF-8 sem BOM / LF)
python bibliotecario.py testar
```

### Regras de Higiene do Repositório
1. **Codificação Estrita:** Todos os arquivos `.md`, `.json`, `.py`, `.html`, `.css`, `.js` devem estar em **UTF-8 sem BOM** e fim de linha **LF (`\n`)**. O comando `python bibliotecario.py sincronizar` normaliza automaticamente os arquivos de backend, e `python bibliotecario.py testar` audita todo o repositório.
2. **Nada é Apagado:** Se precisar remover ou substituir um livro ou arquivo antigo, nunca o delete permanentemente — mova-o para `99_LIXEIRA/<YYYY-MM-DD>/` (que já está ignorada no `.gitignore`) e rode `python bibliotecario.py sincronizar`.
