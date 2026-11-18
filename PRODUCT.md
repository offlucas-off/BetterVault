# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Aplicação web local-first autônoma (`02_BIBLIOTECA_SIMPLES/ui/`: HTML5, CSS3 e JavaScript puro) acoplada ao motor e servidor local em Python (`bibliotecario.py`, stdlib pura) e ao catálogo compilado (`catalogo.json`), operando diretamente sobre arquivos Markdown abertos (`INDICE_MASTER.md`, `categorias/*.md`, `capas/*.md`) e pastas de pacotes completos (`livros_abertos/LIV-NNN/`).

## Users

- **Usuários primários:** Criadores, estudantes, pesquisadores e **usuários leigos** que desejam guardar, organizar e consultar materiais densos (livros/PDFs, vídeos, galerias de fotos, códigos e repositórios GitHub) por uma interface visual acolhedora, sem precisar lidar com terminal, caminhos de arquivo ou jargões de programação.
- **Consumidor secundário:** Agentes de IA (`O Bibliotecário`) que consultam a mesma base em 3 saltos curtos (`Índice Master -> Categoria -> Capa`) antes de abrir qualquer arquivo pesado no `Livro Aberto`.

## Product Purpose

Funcionar como **Referência Única Autônoma** (substituindo o Obsidian e sem depender de nenhum vault externo) estruturada em **3 peças simples**:
1. **O Bibliotecário:** Recepção inteligente e motor de busca instantânea que localiza o material e aponta o trecho exato.
2. **A Biblioteca e as Capas dos Livros:** Estantes por categoria (`INDICE_MASTER.md` -> `categorias/*.md`) e fichas de resumo rápido (`capas/*.md`) com índice clicável ("Ir Direto ao Ponto").
3. **O Livro Aberto:** O material completo guardado sem fragmentação (`livros_abertos/LIV-NNN/`: Livro/PDF, Código Fonte, Repositório GitHub, Vídeo, Fotos), aberto diretamente no capítulo, minuto ou arquivo desejado.

## Positioning

Diferente de ferramentas técnicas que exigem configurar vaults, plugins ou comandos de terminal, esta Biblioteca combina a **simplicidade visual de uma estante de livros ilustrada para usuários leigos** (no Modo Padrão) com a **eficiência extrema de 3 saltos em Markdown puro para agentes de IA** (98% de economia de leitura antes de tocar no arquivo pesado, acessível no Modo Avançado recolhido).

## Operating Context

- **Autonomia total (Sem Obsidian e sem vault externo):** O Obsidian será desativado e nenhum outro vault é considerado na arquitetura; este sistema é a referência única para guardar e consultar todo conhecimento aprendido.
- **Dupla camada de experiência (Leigo vs. Avançado):** A tela principal fala 100% em linguagem humana (*Estantes*, *Capas*, *Resumo de 1 min*, *Ir Direto ao Ponto*, *+ Guardar Material*), enquanto métricas técnicas (`tokens`, `.md` bruto, `CLI`) ficam recolhidas numa gaveta lateral opcional.
- **Topologia visual aprovada:** Barra do Bibliotecário no topo + 3 Colunas principais (Estantes | Capas | Contracapa com Índice Rápido) + Painel Multimodal do Livro Aberto + Gaveta lateral direita recolhida por padrão.

## Capabilities and Constraints

- **3 Estruturas Simples no Disco:** `INDICE_MASTER.md` -> `categorias/<cat>.md` -> `capas/LIV-NNN_*.md` + `livros_abertos/LIV-NNN/`.
- **Índice Rápido ("Ir Direto ao Ponto") na Capa:** Toda Capa lista os pontos internos do Livro Aberto (capítulo/página do PDF, minuto do vídeo, foto ou bloco de código) para abertura cirúrgica em 1 clique.
- **Ciclo Completo pela Interface:** Além de buscar e ler, planejado o assistente visual **"+ Guardar na Biblioteca"** para cadastrar novos materiais sem usar linha de comando.
- **Zero Perda ou Aprisionamento:** Tudo permanece salvo em arquivos reais e legíveis no disco, sincronizados em `< 15 ms` pelo `bibliotecario.py`.

## Accessibility & Inclusion

- **Linguagem inclusiva para leigos:** Zero jargão obrigatório na superfície principal; ícones semânticos claros (`Livro/PDF`, `Vídeo`, `Fotos`, `Código/GitHub`) e explicações em linguagem simples no topo de itens técnicos.
- **Navegação por teclado e leitor:** Atalho `Ctrl+K` para busca, setas para navegar entre Capas, `Enter` para abrir o Livro Aberto, `Esc` para voltar à estante, foco visível e contraste WCAG AA em temas claro e escuro.
- **Movimento reduzido:** Respeito integral a `prefers-reduced-motion: reduce`.

## Evidence on Hand

- Protótipo funcional v1 da Biblioteca Simples em `02_BIBLIOTECA_SIMPLES/` (34 arquivos validados em UTF-8 sem BOM e LF).
- Motor `bibliotecario.py` medido: sincronização completa em `14,99 ms`, busca média em `2,14 ms` (`< 10 ms`) e economia média medida de `98%` entre leitura da Capa (`~425 tokens`) e Livro Aberto (`14.200–28.500 tokens`).
- Planejamento de evolução para Referência Única e Interface Friendly em `02_BIBLIOTECA_SIMPLES/PLANO_UI_FRIENDLY_E_REFERENCIA_UNICA.md`.

## Product Principles

1. **Referência única e autossuficiente:** Nenhum editor ou vault externo é necessário para guardar, achar ou ler um conhecimento.
2. **Amigável na superfície, cirúrgico por baixo:** Para o humano leigo, é uma biblioteca visual de 1 minuto de leitura; para a IA, é um índice enxuto de 3 saltos.
3. **A Capa resolve 80%; o Livro Aberto abre no ponto exato:** Ninguém perde tempo procurando dentro de um PDF de 200 páginas ou de um vídeo de 1 hora.
4. **Tudo do mesmo tema mora na mesma caixa (`LIV-NNN`):** PDF, vídeo, imagens e código de um assunto ficam juntos no seu Livro Aberto.
