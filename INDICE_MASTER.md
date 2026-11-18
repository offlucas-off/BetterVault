# Índice Master — BetterVault (Biblioteca de 3 Estruturas)

> **Porta de Entrada Única (3 Passos Simples):** Escolha a Estante (`categorias/<id>.md`), leia o resumo de 1 minuto na **Capa (`capas/LIV-NNN_*.md`)** e abra o **Livro Aberto (`livros_abertos/LIV-NNN/`)** direto na página ou minuto exato.

## 1. Estantes por Categoria (Sub-Índices)

| Categoria | Sub-Índice Markdown | Livros | O que você encontra nesta Estante |
|---|---|---|---|
| **Engenharia & Código** | `categorias/engenharia-e-codigo.md` | `0` | Projetos de software, scripts, arquitetura de sistemas, automações, APIs e repositórios de código. |
| **Mídia, Vídeo & Motion** | `categorias/midia-e-motion.md` | `0` | Vídeos com capítulos em minutos, roteiros, edição audiovisual, design, animações e galerias de referência visual. |
| **Referências, Livros & Estudos** | `categorias/referencias-e-livros.md` | `0` | Livros digitais, artigos, PDFs divididos por capítulo, manuais técnicos, pesquisas e notas de estudo. |

## 2. Mapa Direto de Capas (Acesso Rápido por ID e Tipo)

| ID | Título | Categoria | Tipo Principal | Capa (`Resumo 1 min`) | Livro Aberto (`Material Completo`) |
|---|---|---|---|---|---|
| — | *(Estante limpa — nenhum material catalogado ainda)* | — | — | — | — |

## 3. Comandos Rápidos do Bibliotecário (`< 5 ms`)
- Iniciar Interface Visual + API Local: `python bibliotecario.py servir --porta 4325`
- Buscar Capa + Ponto Exato: `python bibliotecario.py buscar "<termo>"`
- Catalogar Novo Material: `python bibliotecario.py catalogar --titulo "..." --categoria engenharia-e-codigo --tipo codigo-fonte`
- Sincronizar Índices e Catálogo: `python bibliotecario.py sincronizar`
- Verificar Integridade Completa: `python bibliotecario.py testar`
