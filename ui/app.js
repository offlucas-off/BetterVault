/* ==========================================================================
   PROJETO 2: BIBLIOTECA SIMPLES (REFERÊNCIA ÚNICA AUTÔNOMA & FRIENDLY — app.js)
   Ondas 1, 2 e 3:
   1. Linguagem 100% Humana por Padrão (Modo Simples vs. Modo Técnico / IA)
   2. Estante Viva, Capas Ilustradas, "Ir Direto ao Ponto" e Livro Aberto Explicado
   3. Assistente Visual "+ Guardar na Biblioteca" (Modal de 3 Passos + POST /api/guardar + localStorage)
   ========================================================================== */

const FALLBACK_CATALOGO = {
  "gerado_em": "2026-11-18T12:40:23Z",
  "metricas": {
    "total_categorias": 3,
    "total_livros": 0,
    "tokens_indice_master": 336,
    "tokens_medios_capa": 0,
    "economia_media_pct": 0
  },
  "categorias": [
    {
      "id": "engenharia-e-codigo",
      "nome": "Engenharia & Código",
      "descricao": "Projetos de software, scripts, arquitetura de sistemas, automações, APIs e repositórios de código.",
      "total": 0
    },
    {
      "id": "midia-e-motion",
      "nome": "Mídia, Vídeo & Motion",
      "descricao": "Vídeos com capítulos em minutos, roteiros, edição audiovisual, design, animações e galerias de referência visual.",
      "total": 0
    },
    {
      "id": "referencias-e-livros",
      "nome": "Referências, Livros & Estudos",
      "descricao": "Livros digitais, artigos, PDFs divididos por capítulo, manuais técnicos, pesquisas e notas de estudo.",
      "total": 0
    }
  ],
  "livros": []
};

(function iniciarBibliotecaSimples() {
  "use strict";

  const CHAVE_LOCAL_STORAGE = "biblioteca_simples_itens_locais_v1";

  // Estado reativo único da aplicação
  const estado = {
    catalogo: JSON.parse(JSON.stringify(FALLBACK_CATALOGO)),
    fonteCarregamento: "acervo local pronto",
    modoExperiencia: "simples", // "simples" (100% humano) ou "tecnico" (IA / .md / tokens)
    categoriaAtiva: "todas",
    tipoMidiaAtivo: "todos",
    termoBusca: "",
    livroSelecionadoId: null,
    coordenadaDestacadaIdx: null,
    modoMarkdownMaster: false,
    modoMarkdownCapa: false,
    railDireitaAberta: false,
    abaMobileAtiva: "capas",
    modalAberto: false,
    modalGuardarAberto: false,
    arquivoModalIdx: 0,
    coordenadaModalAtiva: null,
    timestampVideoAtivo: 0,
    cacheMarkdown: {}
  };

  // Gera sugestões de perguntas dinamicamente a partir dos livros reais do catálogo
  function obterPerguntasSugeridas() {
    const livros = estado.catalogo.livros || [];
    return livros.slice(0, 6).map((livro) => {
      const meta = TIPOS_MIDIA_META[livro.tipo_principal] || TIPOS_MIDIA_META["pdf-livro"];
      const gatilhoPrincipal = (livro.gatilhos && livro.gatilhos[0]) || livro.titulo;
      const tituloCurto =
        livro.titulo && livro.titulo.length > 36
          ? `${livro.titulo.slice(0, 34)}…`
          : livro.titulo || livro.id;
      return {
        rotulo: `${meta.emoji} ${tituloCurto}`,
        pergunta: gatilhoPrincipal,
        livroId: livro.id,
        coordIdx: 0
      };
    });
  }

  // Metadados visuais e selos amigáveis por tipo de mídia
  const TIPOS_MIDIA_META = {
    "pdf-livro": {
      rotulo: "📘 Livro / PDF",
      rotuloCurto: "Livro / PDF",
      emoji: "📘",
      cor: "#0ea5e9",
      arteSvg: `<svg viewBox="0 0 36 26" width="32" height="22" fill="none" stroke="#0ea5e9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h11a4 4 0 0 1 4 4v15a3 3 0 0 0-3-3H3z"/><path d="M33 4H22a4 4 0 0 0-4 4v15a3 3 0 0 1 3-3h12z"/></svg>`
    },
    "video": {
      rotulo: "🎬 Vídeo-Aula",
      rotuloCurto: "Vídeo-Aula",
      emoji: "🎬",
      cor: "#f59e0b",
      arteSvg: `<svg viewBox="0 0 36 26" width="32" height="22" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="30" height="20" rx="4"/><polygon points="15 9 24 13 15 17 15 9" fill="rgba(245,158,11,0.25)"/></svg>`
    },
    "fotos-ref": {
      rotulo: "🖼️ Álbum Visual",
      rotuloCurto: "Álbum Visual",
      emoji: "🖼️",
      cor: "#ec4899",
      arteSvg: `<svg viewBox="0 0 36 26" width="32" height="22" fill="none" stroke="#ec4899" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="30" height="20" rx="4"/><circle cx="11" cy="10" r="2.2"/><path d="m33 17-7-6-14 12"/></svg>`
    },
    "codigo-fonte": {
      rotulo: "💻 Projeto / Código",
      rotuloCurto: "Projeto / Código",
      emoji: "💻",
      cor: "#10b981",
      arteSvg: `<svg viewBox="0 0 36 26" width="32" height="22" fill="none" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 19 30 13 23 7"/><polyline points="13 7 6 13 13 19"/><line x1="19" y1="5" x2="17" y2="21"/></svg>`
    },
    "github-repo": {
      rotulo: "💻 Projeto / Código",
      rotuloCurto: "Repositório / Projeto",
      emoji: "🗂️",
      cor: "#6366f1",
      arteSvg: `<svg viewBox="0 0 36 26" width="32" height="22" fill="none" stroke="#6366f1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="7" r="2.5"/><circle cx="10" cy="19" r="2.5"/><circle cx="26" cy="13" r="2.5"/><path d="M10 9.5v7"/><path d="M23.5 13H16a4 4 0 0 1-4-4"/></svg>`
    },
    "pacote-misto": {
      rotulo: "📦 Guia Completo",
      rotuloCurto: "Guia Completo",
      emoji: "📦",
      cor: "#8b5cf6",
      arteSvg: `<svg viewBox="0 0 36 26" width="32" height="22" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 3 31 9.5v7L18 23 5 16.5v-7L18 3z"/><path d="M5 9.5 18 16l13-6.5"/><path d="M18 16v7"/></svg>`
    }
  };

  const ICONES_CATEGORIA = {
    "todas": "🏛️",
    "engenharia-e-codigo": "💻",
    "midia-e-motion": "🎬",
    "referencias-e-livros": "📚"
  };

  // Utilitários de normalização e busca léxica PT-BR
  function normalizarTexto(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function extrairRadicais(texto) {
    const limpo = normalizarTexto(texto);
    const tokens = limpo.match(/[a-z0-9_.-]+/g) || [];
    const stopwords = new Set([
      "como", "para", "onde", "qual", "quais", "pelo", "pela",
      "com", "sem", "dos", "das", "uma", "uns", "por", "que", "meu", "meus"
    ]);
    return tokens
      .filter((t) => t.length >= 2 && !stopwords.has(t))
      .map((t) => ({
        token: t,
        radical: t.length >= 6 ? t.slice(0, 5) : t
      }));
  }

  function escaparHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatarInlineCode(str) {
    const seguro = escaparHtml(str);
    return seguro
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  // Tradutor amigável para coordenadas (gera onde_amigavel se ausente)
  function traduzirAlvoAmigavel(alvoBruto, tipoBruto) {
    const alvo = String(alvoBruto || "").trim();
    const tipo = String(tipoBruto || "doc").toLowerCase();

    const mTempo = alvo.match(/(\d{1,2}:\d{2}(?:\s*-\s*\d{1,2}:\d{2})?)/);
    if (mTempo || tipo === "video") {
      const trecho = mTempo ? mTempo[1].replace(/\s*-\s*/, " a ") : alvo;
      return `🎬 Vídeo · Minuto ${trecho}`;
    }

    const mCapPag = alvo.match(/Cap(?:ítulo|\.)?\s*(\d+)[^p]*p\.?\s*(\d+)\s*[-–]\s*(\d+)/i);
    if (mCapPag) {
      return `📖 Capítulo ${mCapPag[1]} · Págs. ${mCapPag[2]} a ${mCapPag[3]}`;
    }

    const mPag = alvo.match(/p(?:ág|ag|\.)?\s*(\d+(?:\s*[-–a]\s*\d+)?)/i);
    if (mPag) {
      return `📖 Livro · Pág. ${mPag[1].replace("-", " a ")}`;
    }

    const mPrancha = alvo.match(/Pranchas?\s*([\d\s-a]+)/i);
    if (mPrancha || tipo === "imagem") {
      if (mPrancha) return `🖼️ Galeria · Pranchas ${mPrancha[1].replace("-", " a ")}`;
      return `🖼️ Ilustração Visual`;
    }

    const mLinhas = alvo.match(/:(\d+)-(\d+)/);
    if (mLinhas) {
      if (tipo === "codigo" || /\.(js|ts|py|sh|css|json|jsonl)/i.test(alvo)) {
        return `💻 Código · Linhas ${mLinhas[1]} a ${mLinhas[2]}`;
      }
      return `📄 Documento · Linhas ${mLinhas[1]} a ${mLinhas[2]}`;
    }

    const mCap = alvo.match(/Cap(?:ítulos?|\.)\s*([\d-]+)/i);
    if (mCap) {
      return `📖 Guia · Capítulos ${mCap[1].replace("-", " a ")}`;
    }

    if (alvo.length > 0) {
      return `📍 ${alvo}`;
    }
    return "📍 Ponto principal";
  }

  function iconeParaTipoCoordenada(tipo, ondeAmigavel) {
    const t = String(tipo || "").toLowerCase();
    const o = String(ondeAmigavel || "");
    if (o.startsWith("🎬") || o.startsWith("📖") || o.startsWith("🖼️") || o.startsWith("💻") || o.startsWith("📄")) {
      return "";
    }
    if (t === "video") return "🎬 ";
    if (t === "pdf") return "📖 ";
    if (t === "imagem") return "🖼️ ";
    if (t === "codigo") return "💻 ";
    return "📄 ";
  }

  function normalizarCoordenada(coord) {
    const tiposConhecidos = new Set(["codigo", "pdf", "video", "imagem", "doc", "markdown"]);
    if (!tiposConhecidos.has(coord.tipo) && tiposConhecidos.has(coord.resumo)) {
      const alvoCorrigido = `${coord.alvo} (${coord.tipo})`;
      const tipoCorrigido = coord.resumo;
      return {
        rotulo: coord.rotulo,
        alvo: alvoCorrigido,
        arquivoSugerido: coord.tipo,
        tipo: tipoCorrigido,
        onde_amigavel: coord.onde_amigavel || traduzirAlvoAmigavel(alvoCorrigido, tipoCorrigido),
        resumo: `Trecho direto em ${coord.tipo} (${coord.alvo})`
      };
    }
    const tipoFinal = coord.tipo || "doc";
    return {
      rotulo: coord.rotulo || "Ponto do Material",
      alvo: coord.alvo || "Início",
      arquivoSugerido: coord.alvo || "",
      tipo: tipoFinal,
      onde_amigavel: coord.onde_amigavel || traduzirAlvoAmigavel(coord.alvo, tipoFinal),
      resumo: coord.resumo || "Acesse este ponto diretamente no Livro Aberto."
    };
  }

  function obterExplicacaoLeiga(livro) {
    if (livro && livro.explicacao_leiga && livro.explicacao_leiga.trim()) {
      return livro.explicacao_leiga.trim();
    }
    if (livro && livro.subtitulo) {
      return livro.subtitulo;
    }
    return "Material organizado para consulta rápida de 1 minuto ou leitura aprofundada no Livro Aberto.";
  }

  function obterTempoMaterialCompleto(livro) {
    if (livro && livro.tempo_material_completo) {
      return livro.tempo_material_completo;
    }
    const qtd = ((livro && livro.livro_aberto && livro.livro_aberto.arquivos) || []).length || 1;
    if (livro && livro.tipo_principal === "video") return "14 min de vídeo";
    if (livro && livro.tipo_principal === "pdf-livro") return "68 páginas";
    return `Pacote com ${qtd} ${qtd === 1 ? "arquivo" : "arquivos"}`;
  }

  // Pontuação determinística do Bibliotecário
  function pontuarLivro(livro, consulta) {
    const termos = extrairRadicais(consulta);
    if (!termos.length) {
      return { pontos: 0, melhorCoordIdx: 0, motivos: [] };
    }

    const normTitulo = normalizarTexto(`${livro.id} ${livro.titulo} ${livro.subtitulo}`);
    const normGatilhos = normalizarTexto(
      (livro.gatilhos || []).concat(livro.tags || []).concat([livro.explicacao_leiga || ""]).join(" ")
    );
    const normResumo = normalizarTexto(livro.resumo_capa);

    let pontos = 0;
    const motivos = new Set();

    for (const { token, radical } of termos) {
      if (normTitulo.includes(token) || (radical.length >= 4 && normTitulo.includes(radical))) {
        pontos += 8;
        motivos.add("título");
      }
      if (normGatilhos.includes(token) || (radical.length >= 4 && normGatilhos.includes(radical))) {
        pontos += 6;
        motivos.add("tema/dúvida");
      }
      if (normResumo.includes(token) || (radical.length >= 4 && normResumo.includes(radical))) {
        pontos += 2;
        motivos.add("resumo");
      }
    }

    let melhorCoordIdx = 0;
    let maiorPontoCoord = -1;

    (livro.coordenadas || []).forEach((rawCoord, idx) => {
      const c = normalizarCoordenada(rawCoord);
      const textoCoord = normalizarTexto(`${c.rotulo} ${c.alvo} ${c.onde_amigavel} ${c.resumo}`);
      let ptsCoord = 0;
      for (const { token, radical } of termos) {
        if (textoCoord.includes(token) || (radical.length >= 4 && textoCoord.includes(radical))) {
          ptsCoord += 4;
        }
      }
      if (ptsCoord > 0) {
        pontos += ptsCoord;
        motivos.add("ponto direto");
      }
      if (ptsCoord > maiorPontoCoord) {
        maiorPontoCoord = ptsCoord;
        melhorCoordIdx = idx;
      }
    });

    return {
      pontos,
      melhorCoordIdx,
      motivos: Array.from(motivos)
    };
  }

  function obterLivrosVisiveis() {
    const livros = estado.catalogo.livros || [];
    const filtrados = livros.filter((livro) => {
      const bateCategoria =
        estado.categoriaAtiva === "todas" || livro.categoria === estado.categoriaAtiva;

      const bateTipo =
        estado.tipoMidiaAtivo === "todos" ||
        livro.tipo_principal === estado.tipoMidiaAtivo ||
        (estado.tipoMidiaAtivo === "codigo-fonte" && livro.tipo_principal === "github-repo") ||
        (livro.tipo_principal === "pacote-misto" &&
          (livro.tags || []).some((t) => t.includes(estado.tipoMidiaAtivo)));

      if (!bateCategoria || !bateTipo) {
        return false;
      }

      if (!estado.termoBusca.trim()) {
        return true;
      }

      const avaliacao = pontuarLivro(livro, estado.termoBusca);
      return avaliacao.pontos > 0;
    });

    if (estado.termoBusca.trim()) {
      filtrados.sort((a, b) => {
        const pa = pontuarLivro(a, estado.termoBusca).pontos;
        const pb = pontuarLivro(b, estado.termoBusca).pontos;
        return pb - pa;
      });
    }

    return filtrados;
  }

  function obterLivroPorId(id) {
    const livros = estado.catalogo.livros || [];
    return livros.find((l) => l.id === id) || livros[0] || null;
  }

  function obterCategoriaPorId(catId) {
    return (estado.catalogo.categorias || []).find((c) => c.id === catId) || null;
  }

  // Persistência local (localStorage) para itens guardados sem servidor Python
  function lerLivrosLocaisSalvos() {
    try {
      const bruto = localStorage.getItem(CHAVE_LOCAL_STORAGE);
      if (!bruto) return [];
      const arr = JSON.parse(bruto);
      return Array.isArray(arr) ? arr : [];
    } catch (_e) {
      return [];
    }
  }

  function salvarLivroLocalNoStorage(novoLivro) {
    try {
      const atuais = lerLivrosLocaisSalvos().filter((l) => l.id !== novoLivro.id);
      atuais.push(novoLivro);
      localStorage.setItem(CHAVE_LOCAL_STORAGE, JSON.stringify(atuais));
    } catch (_e) {
      // Ignora erro de quota
    }
  }

  function mesclarLivrosLocaisAoCatalogo() {
    const locais = lerLivrosLocaisSalvos();
    if (!locais.length) return;
    const idsExistentes = new Set((estado.catalogo.livros || []).map((l) => l.id));
    for (const item of locais) {
      if (item.categoria && !obterCategoriaPorId(item.categoria)) {
        estado.catalogo.categorias.push({
          id: item.categoria,
          nome: item.nome_categoria || item.categoria,
          descricao: `Materiais e referências catalogados na estante ${item.nome_categoria || item.categoria}.`,
          total: 0
        });
      }
      if (!idsExistentes.has(item.id)) {
        estado.catalogo.livros.push(item);
        idsExistentes.add(item.id);
      }
    }
    recalcularTotaisCategorias();
  }

  function recalcularTotaisCategorias() {
    const livros = estado.catalogo.livros || [];
    for (const cat of estado.catalogo.categorias || []) {
      cat.total = livros.filter((l) => l.categoria === cat.id).length;
    }
    if (estado.catalogo.metricas) {
      estado.catalogo.metricas.total_livros = livros.length;
      estado.catalogo.metricas.total_categorias = (estado.catalogo.categorias || []).length;
    }
  }

  // Carregamento inicial de /api/catalogo ou ../catalogo.json com fallback garantido
  async function carregarCatalogoInicial() {
    const urlsTentativa = ["/api/catalogo", "../catalogo.json"];
    for (const url of urlsTentativa) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        const resp = await fetch(url, { signal: controller.signal, cache: "no-store" });
        clearTimeout(timer);
        if (resp.ok) {
          const json = await resp.json();
          if (json && Array.isArray(json.livros)) {
            estado.catalogo = json;
            estado.fonteCarregamento = url === "/api/catalogo" ? "Servidor Local (API)" : "../catalogo.json";
            break;
          }
        }
      } catch (_err) {
        // Continua para o próximo ou usa o fallback
      }
    }
    mesclarLivrosLocaisAoCatalogo();
    renderizarTudo();
  }

  // Geradores determinísticos de Markdown Puro para o Modo Técnico
  function gerarMarkdownMasterFallback() {
    const cats = estado.catalogo.categorias || [];
    const livros = estado.catalogo.livros || [];
    let md = `# Índice Master — Biblioteca Simples (Referência Única)\n\n`;
    md += `> **Porta de Entrada Única (Salto 1 de 3):** Escolha a Estante (\`categorias/<id>.md\`), leia a **Capa do Material (\`capas/LIV-NNN_*.md\`)** e abra o **Livro Aberto (\`livros_abertos/LIV-NNN/\`)** direto no ponto.\n\n`;
    md += `## 1. Estantes por Categoria\n\n`;
    md += `| Categoria | Sub-Índice Markdown | Materiais | Escopo |\n|---|---|---|---|\n`;
    for (const c of cats) {
      md += `| **${c.nome}** | \`categorias/${c.id}.md\` | \`${c.total}\` | ${c.descricao} |\n`;
    }
    md += `\n## 2. Mapa Direto de Capas\n\n`;
    md += `| ID | Título | Categoria | Tipo Principal | Capa (\`Salto 3\`) | Livro Aberto |\n|---|---|---|---|---|---|\n`;
    for (const l of livros) {
      md += `| \`${l.id}\` | ${l.titulo} | \`${l.categoria}\` | \`${l.tipo_principal}\` | \`${l.caminho_capa}\` | \`${l.caminho_livro_aberto}\` |\n`;
    }
    return md;
  }

  function gerarMarkdownCategoriaFallback(catId) {
    const cat = obterCategoriaPorId(catId) || (estado.catalogo.categorias || [])[0];
    if (!cat) return "";
    const livros = (estado.catalogo.livros || []).filter((l) => l.categoria === cat.id);
    let md = `# Sub-Índice da Estante: ${cat.nome}\n\n`;
    md += `> **Salto 2 de 3 (\`categorias/${cat.id}.md\`):** ${cat.descricao}\n\n`;
    for (const l of livros) {
      md += `## \`${l.id}\` — ${l.titulo}\n`;
      md += `- **Para que serve:** ${obterExplicacaoLeiga(l)}\n`;
      md += `- **Formato:** \`${l.tipo_principal}\` · **Capa:** \`${l.caminho_capa}\`\n\n`;
    }
    return md;
  }

  function gerarMarkdownCapaFallback(livro) {
    if (!livro) return "";
    let md = `---\nid: ${livro.id}\ntitulo: "${livro.titulo}"\ncategoria: ${livro.categoria}\ntipo_principal: ${livro.tipo_principal}\nexplicacao_leiga: "${obterExplicacaoLeiga(livro)}"\ntempo_leitura_capa: "${livro.tempo_leitura_capa || "1 min"}"\ntempo_material_completo: "${obterTempoMaterialCompleto(livro)}"\n---\n\n`;
    md += `# ${livro.id} — ${livro.titulo}\n\n`;
    md += `> **Para que serve:** ${obterExplicacaoLeiga(livro)}\n\n`;
    md += `## 1. Resumo da Capa\n\n${livro.resumo_capa}\n\n`;
    md += `## 2. Quando Consultar\n`;
    for (const g of livro.gatilhos || []) {
      md += `- ${g}\n`;
    }
    md += `\n## 3. Ir Direto ao Ponto (\`${livro.caminho_livro_aberto}\`)\n\n`;
    md += `| Ponto | Onde fica | Tipo | O que ensina |\n|---|---|---|---|\n`;
    for (const rawC of livro.coordenadas || []) {
      const c = normalizarCoordenada(rawC);
      md += `| **${c.rotulo}** | \`${c.alvo}\` | \`${c.tipo}\` | ${c.resumo} |\n`;
    }
    return md;
  }

  async function obterConteudoMarkdownReal(caminhoRelativo, geradorFallback) {
    if (estado.cacheMarkdown[caminhoRelativo]) {
      return estado.cacheMarkdown[caminhoRelativo];
    }
    try {
      const resp = await fetch(`../${caminhoRelativo}`, { cache: "no-store" });
      if (resp.ok) {
        const texto = await resp.text();
        estado.cacheMarkdown[caminhoRelativo] = texto;
        return texto;
      }
    } catch (_e) {
      // Fallback local
    }
    const gerado = geradorFallback();
    estado.cacheMarkdown[caminhoRelativo] = gerado;
    return gerado;
  }

  // ==========================================================================
  // RENDERIZAÇÃO DAS 3 ESTRUTURAS (MODO SIMPLES + MODO TÉCNICO)
  // ==========================================================================

  function atualizarModoExperienciaDOM() {
    document.body.setAttribute("data-experiencia", estado.modoExperiencia);
    const chk = document.getElementById("switch-modo-tecnico");
    const statusEl = document.getElementById("status-modo-experiencia");
    const emTecnico = estado.modoExperiencia === "tecnico";

    if (chk && chk.checked !== emTecnico) {
      chk.checked = emTecnico;
    }
    if (statusEl) {
      statusEl.innerHTML = emTecnico
        ? `Modo atual: <strong>Modo Técnico / IA (Tokens, .md e CLI visíveis)</strong>`
        : `Modo atual: <strong>Modo Simples (100% Humano e Acolhedor)</strong>`;
    }

    // Se saiu do modo técnico enquanto via Markdown puro, volta para a visão humana
    if (!emTecnico && (estado.modoMarkdownMaster || estado.modoMarkdownCapa)) {
      estado.modoMarkdownMaster = false;
      estado.modoMarkdownCapa = false;
    }
  }

  function renderizarPerguntasRapidas() {
    const container = document.getElementById("perguntas-rapidas");
    const labelEl = document.getElementById("perguntas-label");
    if (!container) return;

    const sugestoes = obterPerguntasSugeridas();
    if (sugestoes.length === 0) {
      if (labelEl) labelEl.textContent = "Comece agora:";
      container.innerHTML = `<button type="button" class="pergunta-chip pergunta-chip-cta" data-acao-guardar="true" title="Abrir o assistente visual para guardar seu primeiro livro, vídeo, foto ou código">+ Sua biblioteca está limpa — Clique aqui para guardar seu primeiro material</button>`;
      return;
    }

    if (labelEl) labelEl.textContent = "Perguntas rápidas do seu acervo:";
    container.innerHTML = sugestoes.map((item, idx) => {
      const ativo = estado.termoBusca === item.pergunta ? "is-active" : "";
      return `<button type="button" class="pergunta-chip ${ativo}" data-pergunta-idx="${idx}" title="${escaparHtml(item.pergunta)}">${escaparHtml(item.rotulo)}</button>`;
    }).join("");
  }

  function renderizarTelemetriaECaminho() {
    const livro = obterLivroPorId(estado.livroSelecionadoId);
    const metricas = estado.catalogo.metricas || {};
    const tokensMaster = metricas.tokens_indice_master || 336;
    const cat = livro ? obterCategoriaPorId(livro.categoria) : null;

    // Passo 1: Escolher Estante
    const elSalto1Nome = document.getElementById("salto-1-nome");
    const elSalto1Tok = document.getElementById("salto-1-tokens");
    if (elSalto1Nome) {
      elSalto1Nome.textContent = cat ? `Estante: ${cat.nome}` : "Escolher Estante";
    }
    if (elSalto1Tok) {
      elSalto1Tok.textContent = `${tokensMaster} tok`;
    }

    // Passo 2: Ler Resumo da Capa (1 min)
    const elSalto2Nome = document.getElementById("salto-2-nome");
    const elSalto2Tok = document.getElementById("salto-2-tokens");
    if (elSalto2Nome) {
      const tempoCapa = (livro && livro.tempo_leitura_capa) || "1 min";
      elSalto2Nome.textContent = `Ler Resumo da Capa (${tempoCapa})`;
    }
    if (elSalto2Tok) {
      elSalto2Tok.textContent = livro ? "240 tok" : "0 tok";
    }

    // Passo 3: Ir Direto ao Ponto no Material
    const elSalto3Nome = document.getElementById("salto-3-nome");
    const elSalto3Tok = document.getElementById("salto-3-tokens");
    if (elSalto3Nome) {
      if (livro) {
        const coords = (livro.coordenadas || []).map(normalizarCoordenada);
        const coordIdx = estado.coordenadaDestacadaIdx;
        if (coordIdx !== null && coords[coordIdx]) {
          elSalto3Nome.textContent = `Ir Direto: ${coords[coordIdx].onde_amigavel.replace(/^[^\wÀ-ú]+/, "")}`;
        } else {
          elSalto3Nome.textContent = "Ir Direto ao Ponto no Material";
        }
      } else {
        elSalto3Nome.textContent = "Ir Direto ao Ponto no Material";
      }
    }
    if (elSalto3Tok) {
      elSalto3Tok.textContent = livro ? `${livro.tokens_capa || 500} tok` : "0 tok";
    }

    // Salto 4 Técnico
    const elSalto4 = document.getElementById("salto-4");
    const elSalto4Nome = document.getElementById("salto-4-nome");
    if (elSalto4 && elSalto4Nome) {
      if (livro) {
        const coordIdx = estado.coordenadaDestacadaIdx;
        const coords = livro.coordenadas || [];
        if (coordIdx !== null && coords[coordIdx]) {
          const c = normalizarCoordenada(coords[coordIdx]);
          elSalto4.classList.add("is-surgical");
          elSalto4Nome.textContent = c.alvo;
        } else if (estado.modalAberto && estado.coordenadaModalAtiva) {
          elSalto4.classList.add("is-surgical");
          elSalto4Nome.textContent = estado.coordenadaModalAtiva.alvo;
        } else {
          elSalto4.classList.remove("is-surgical");
          elSalto4Nome.textContent = `Abrir ${livro.id}`;
        }
      } else {
        elSalto4.classList.remove("is-surgical");
        elSalto4Nome.textContent = "[Opcional] Coordenada";
      }
    }

    // Medidor de Tempo Economizado (Humano) + Tokens (Modo Técnico)
    const elTempoResumo = document.getElementById("tempo-resumo-capa");
    const elTempoCompleto = document.getElementById("tempo-material-completo");
    const elCapa = document.getElementById("eff-tokens-capa");
    const elLivro = document.getElementById("eff-tokens-livro");
    const elBadge = document.getElementById("eff-pct-badge");
    const elFill = document.getElementById("eff-bar-fill");

    if (livro) {
      if (elTempoResumo) {
        elTempoResumo.textContent = livro.tempo_leitura_capa || "1 min";
      }
      if (elTempoCompleto) {
        elTempoCompleto.textContent = obterTempoMaterialCompleto(livro);
      }

      const tokCapa = livro.tokens_capa || 500;
      const tokLivro = livro.tokens_livro_aberto_est || 18000;
      const pct = Math.max(1, Math.min(99.9, (1 - tokCapa / tokLivro) * 100)).toFixed(1);

      if (elCapa) elCapa.textContent = `${tokCapa.toLocaleString("pt-BR")} tokens`;
      if (elLivro) elLivro.textContent = `${tokLivro.toLocaleString("pt-BR")} tokens`;
      if (elBadge) elBadge.textContent = `${pct.replace(".", ",")}% poupado`;
      if (elFill) elFill.style.width = `${pct}%`;
    } else {
      if (elTempoResumo) elTempoResumo.textContent = "1 min";
      if (elTempoCompleto) elTempoCompleto.textContent = "Estante limpa (0 itens)";
      if (elCapa) elCapa.textContent = "0 tokens";
      if (elLivro) elLivro.textContent = "0 tokens";
      if (elBadge) elBadge.textContent = "Instalação limpa";
      if (elFill) elFill.style.width = "100%";
    }

    // Métricas técnicas na Coluna 1
    const elMetMaster = document.getElementById("metric-tokens-master");
    const elMetCapa = document.getElementById("metric-tokens-capa");
    const elMetEco = document.getElementById("metric-economia-media");
    const elMetFonte = document.getElementById("metric-fonte-dados");

    if (elMetMaster) elMetMaster.textContent = `~${tokensMaster} tok`;
    if (elMetCapa) elMetCapa.textContent = `~${metricas.tokens_medios_capa || 0} tok`;
    if (elMetEco) elMetEco.textContent = `${metricas.economia_media_pct || 0}%`;
    if (elMetFonte) elMetFonte.innerHTML = `<code>${escaparHtml(estado.fonteCarregamento)}</code>`;
  }

  function renderizarColunaMaster() {
    const lista = document.getElementById("lista-categorias");
    if (!lista) return;

    const categorias = estado.catalogo.categorias || [];
    const todosLivros = estado.catalogo.livros || [];
    const totalLivros = todosLivros.length;

    const htmlTodas = `
      <li role="option" aria-selected="${estado.categoriaAtiva === "todas"}">
        <button type="button" class="estante-item ${estado.categoriaAtiva === "todas" ? "is-active" : ""}" data-cat-id="todas">
          <div class="estante-top">
            <div class="estante-name-wrap">
              <span class="estante-icon-box" aria-hidden="true">${ICONES_CATEGORIA["todas"]}</span>
              <span class="estante-name">Todas as Estantes</span>
            </div>
            <span class="estante-count">${totalLivros}</span>
          </div>
          <p class="estante-desc">Veja todos os livros, vídeos, álbuns visuais e projetos guardados na sua biblioteca.</p>
          <span class="estante-path so-tecnico">INDICE_MASTER.md → categorias/*.md</span>
        </button>
      </li>
    `;

    const htmlCats = categorias.map((cat) => {
      const ativo = estado.categoriaAtiva === cat.id;
      const icone = ICONES_CATEGORIA[cat.id] || "📂";
      return `
        <li role="option" aria-selected="${ativo}">
          <button type="button" class="estante-item ${ativo ? "is-active" : ""}" data-cat-id="${escaparHtml(cat.id)}">
            <div class="estante-top">
              <div class="estante-name-wrap">
                <span class="estante-icon-box" aria-hidden="true">${icone}</span>
                <span class="estante-name">${escaparHtml(cat.nome)}</span>
              </div>
              <span class="estante-count">${cat.total}</span>
            </div>
            <p class="estante-desc">${escaparHtml(cat.descricao)}</p>
            <span class="estante-path so-tecnico">categorias/${escaparHtml(cat.id)}.md</span>
          </button>
        </li>
      `;
    }).join("");

    lista.innerHTML = htmlTodas + htmlCats;

    // Atualiza contadores do painel "Visão Geral do Acervo"
    const qtdLivros = todosLivros.filter(
      (l) => l.tipo_principal === "pdf-livro" || l.tipo_principal === "pacote-misto"
    ).length;
    const qtdVideos = todosLivros.filter((l) => l.tipo_principal === "video").length;
    const qtdFotos = todosLivros.filter((l) => l.tipo_principal === "fotos-ref").length;
    const qtdCodigos = todosLivros.filter(
      (l) => l.tipo_principal === "codigo-fonte" || l.tipo_principal === "github-repo"
    ).length;

    const elCntLivros = document.getElementById("acervo-count-livros");
    const elCntVideos = document.getElementById("acervo-count-videos");
    const elCntFotos = document.getElementById("acervo-count-fotos");
    const elCntCodigos = document.getElementById("acervo-count-codigos");

    if (elCntLivros) elCntLivros.textContent = `${qtdLivros} ${qtdLivros === 1 ? "item" : "itens"}`;
    if (elCntVideos) elCntVideos.textContent = `${qtdVideos} ${qtdVideos === 1 ? "item" : "itens"}`;
    if (elCntFotos) elCntFotos.textContent = `${qtdFotos} ${qtdFotos === 1 ? "item" : "itens"}`;
    if (elCntCodigos) elCntCodigos.textContent = `${qtdCodigos} ${qtdCodigos === 1 ? "item" : "itens"}`;

    document.querySelectorAll("[data-acervo-filtro]").forEach((card) => {
      const f = card.getAttribute("data-acervo-filtro");
      card.classList.toggle("is-active", estado.tipoMidiaAtivo === f);
    });

    // Alternância entre Estantes e Markdown Puro na Coluna 1
    const painelEstantes = document.getElementById("painel-estantes-master");
    const painelMd = document.getElementById("painel-md-master");
    const tabEstante = document.getElementById("tab-visao-estante");
    const tabMd = document.getElementById("tab-visao-md");
    const btnGlobalMd = document.getElementById("btn-modo-markdown");
    const lblGlobalMd = document.getElementById("label-modo-markdown");

    if (painelEstantes && painelMd) {
      painelEstantes.hidden = estado.modoMarkdownMaster;
      painelMd.hidden = !estado.modoMarkdownMaster;
    }
    if (tabEstante && tabMd) {
      tabEstante.classList.toggle("is-active", !estado.modoMarkdownMaster);
      tabEstante.setAttribute("aria-selected", String(!estado.modoMarkdownMaster));
      tabMd.classList.toggle("is-active", estado.modoMarkdownMaster);
      tabMd.setAttribute("aria-selected", String(estado.modoMarkdownMaster));
    }
    if (btnGlobalMd && lblGlobalMd) {
      btnGlobalMd.setAttribute("aria-pressed", String(estado.modoMarkdownMaster));
      lblGlobalMd.textContent = estado.modoMarkdownMaster ? "Voltar às Estantes" : "Ver .md Puro";
    }

    if (estado.modoMarkdownMaster) {
      atualizarPreviewMarkdownMaster();
    }
  }

  async function atualizarPreviewMarkdownMaster() {
    const select = document.getElementById("select-md-arquivo");
    const codeEl = document.getElementById("codigo-md-master");
    if (!select || !codeEl) return;

    const modo = select.value;
    const livro = obterLivroPorId(estado.livroSelecionadoId);
    const catId =
      estado.categoriaAtiva !== "todas"
        ? estado.categoriaAtiva
        : livro
        ? livro.categoria
        : "engenharia-e-codigo";

    let texto = "";
    if (modo === "master") {
      texto = await obterConteudoMarkdownReal("INDICE_MASTER.md", gerarMarkdownMasterFallback);
    } else if (modo === "categoria") {
      texto = await obterConteudoMarkdownReal(`categorias/${catId}.md`, () =>
        gerarMarkdownCategoriaFallback(catId)
      );
    } else if (modo === "capa" && livro) {
      texto = await obterConteudoMarkdownReal(livro.caminho_capa, () =>
        gerarMarkdownCapaFallback(livro)
      );
    }
    codeEl.textContent = texto;
  }

  function renderizarFaixaDestaques() {
    const faixa = document.getElementById("faixa-destaques-biblioteca");
    if (!faixa) return;

    const todosLivros = estado.catalogo.livros || [];
    if (todosLivros.length === 0) {
      faixa.innerHTML = `
        <div class="welcome-strip-top">
          <span class="welcome-badge">✨ Instalação Limpa · Como usar sua Biblioteca em 3 Passos</span>
          <span class="welcome-hint">Zero materiais pré-carregados — pronta para o seu acervo:</span>
        </div>
        <div class="welcome-shortcuts-grid">
          <button type="button" class="welcome-shortcut-card" data-acao-guardar="true">
            <span class="welcome-shortcut-icon" aria-hidden="true">1️⃣</span>
            <div class="welcome-shortcut-text">
              <strong>1. Guarde um material</strong>
              <span>Clique aqui ou em "+ Guardar na Biblioteca" para adicionar um livro, vídeo, foto ou código.</span>
            </div>
          </button>
          <div class="welcome-shortcut-card">
            <span class="welcome-shortcut-icon" aria-hidden="true">2️⃣</span>
            <div class="welcome-shortcut-text">
              <strong>2. Leia o resumo de 1 min na Capa</strong>
              <span>Cada item gera uma Capa leve que explica para que serve sem abrir arquivos pesados.</span>
            </div>
          </div>
          <div class="welcome-shortcut-card">
            <span class="welcome-shortcut-icon" aria-hidden="true">3️⃣</span>
            <div class="welcome-shortcut-text">
              <strong>3. Pule direto para a página ou minuto no Livro Aberto</strong>
              <span>Use os atalhos de "Ir Direto ao Ponto" para abrir exatamente o trecho que precisa.</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const destaques = todosLivros.slice(0, 3);
    faixa.innerHTML = `
      <div class="welcome-strip-top">
        <span class="welcome-badge">👋 Comece por aqui · Destaques da Biblioteca</span>
        <span class="welcome-hint">Escolha um material abaixo para abrir o resumo de 1 minuto:</span>
      </div>
      <div class="welcome-shortcuts-grid">
        ${destaques.map((livro) => {
          const meta = TIPOS_MIDIA_META[livro.tipo_principal] || TIPOS_MIDIA_META["pdf-livro"];
          const explicacao = obterExplicacaoLeiga(livro);
          const resumoCurto = explicacao.length > 88 ? `${explicacao.slice(0, 86)}…` : explicacao;
          return `
            <button type="button" class="welcome-shortcut-card" data-destaque-livro="${escaparHtml(livro.id)}" data-destaque-coord="0">
              <span class="welcome-shortcut-icon" aria-hidden="true">${meta.emoji}</span>
              <div class="welcome-shortcut-text">
                <strong>${escaparHtml(livro.titulo)}</strong>
                <span>${escaparHtml(resumoCurto)}</span>
              </div>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderizarColunaCapas() {
    renderizarFaixaDestaques();

    const grade = document.getElementById("grade-capas");
    const estadoVazio = document.getElementById("estado-vazio-capas");
    const tituloVazio = document.getElementById("titulo-vazio-capas");
    const descVazio = document.getElementById("desc-vazio-capas");
    const btnGuardarPrimeiro = document.getElementById("btn-guardar-primeiro-vazio");
    const btnResetFiltros = document.getElementById("btn-resetar-filtros");
    const tituloCol = document.getElementById("titulo-col-capas");
    const caminhoPill = document.getElementById("caminho-subindice-pill");
    const contagemPill = document.getElementById("contagem-capas-visiveis");
    const mobCount = document.getElementById("mob-count-capas");
    const countTodos = document.getElementById("count-todos");

    const totalAcervo = (estado.catalogo.livros || []).length;
    if (countTodos) {
      countTodos.textContent = String(totalAcervo);
    }

    const catObj = obterCategoriaPorId(estado.categoriaAtiva);
    if (tituloCol) {
      tituloCol.textContent = catObj
        ? `2. Estante: ${catObj.nome}`
        : "2. Capas na Estante — Todos os Materiais";
    }
    if (caminhoPill) {
      caminhoPill.textContent = catObj ? `categorias/${catObj.id}.md` : "categorias/*.md";
    }

    const visiveis = obterLivrosVisiveis();
    if (contagemPill) {
      contagemPill.textContent = `${visiveis.length} ${visiveis.length === 1 ? "Material" : "Materiais"}`;
    }
    if (mobCount) {
      mobCount.textContent = String(visiveis.length);
    }

    if (!grade || !estadoVazio) return;

    if (visiveis.length === 0) {
      grade.innerHTML = "";
      estadoVazio.hidden = false;
      if (totalAcervo === 0) {
        if (tituloVazio) tituloVazio.textContent = "Sua estante está pronta e limpa!";
        if (descVazio) {
          descVazio.textContent =
            "Nenhum material pré-preenchido foi carregado. Guarde seu primeiro livro, vídeo, álbum de referências ou código para começar sua biblioteca.";
        }
        if (btnGuardarPrimeiro) btnGuardarPrimeiro.hidden = false;
        if (btnResetFiltros) btnResetFiltros.hidden = true;
      } else {
        if (tituloVazio) tituloVazio.textContent = "Nenhum material encontrado para esta busca ou filtro.";
        if (descVazio) {
          descVazio.textContent =
            "Tente outras palavras-chave ou clique abaixo para limpar os filtros e mostrar todos os materiais da sua biblioteca.";
        }
        if (btnGuardarPrimeiro) btnGuardarPrimeiro.hidden = true;
        if (btnResetFiltros) btnResetFiltros.hidden = false;
      }
      return;
    }

    estadoVazio.hidden = true;

    if (!visiveis.some((l) => l.id === estado.livroSelecionadoId)) {
      estado.livroSelecionadoId = visiveis[0].id;
    }

    grade.innerHTML = visiveis.map((livro) => {
      const selecionado = livro.id === estado.livroSelecionadoId;
      const metaTipo = TIPOS_MIDIA_META[livro.tipo_principal] || TIPOS_MIDIA_META["pdf-livro"];
      const corLombada = livro.cor_capa || metaTipo.cor;
      const tokCapa = livro.tokens_capa || 500;
      const tokLivro = livro.tokens_livro_aberto_est || 18000;
      const economia = ((1 - tokCapa / tokLivro) * 100).toFixed(1).replace(".", ",");
      const qtdCoords = (livro.coordenadas || []).length;
      const tempoCapa = livro.tempo_leitura_capa || "1 min";
      const tempoCompleto = obterTempoMaterialCompleto(livro);
      const explicacao = obterExplicacaoLeiga(livro);

      return `
        <article
          class="capa-card ${selecionado ? "is-selected" : ""}"
          role="listitem"
          tabindex="0"
          data-livro-id="${escaparHtml(livro.id)}"
          aria-label="${escaparHtml(metaTipo.rotuloCurto)}: ${escaparHtml(livro.titulo)}"
        >
          <div class="capa-lombada" style="--spine-color: ${escaparHtml(corLombada)}"></div>
          <div class="capa-inner">
            <!-- Cabeçalho Ilustrado de Capa -->
            <div class="capa-ilustracao-header" data-tipo-capa="${escaparHtml(livro.tipo_principal)}">
              <div class="capa-ilustracao-left">
                ${metaTipo.arteSvg}
                <span class="capa-art-badge">${escaparHtml(metaTipo.rotulo)}</span>
                <span class="book-id-badge so-tecnico">${escaparHtml(livro.id)}</span>
              </div>
              <span class="capa-full-time-pill">${escaparHtml(tempoCompleto)}</span>
            </div>

            <h3 class="capa-titulo">${escaparHtml(livro.titulo)}</h3>

            <!-- Boxe Destacado: Para que serve -->
            <div class="capa-para-que-serve">
              <strong>Para que serve:</strong> ${escaparHtml(explicacao)}
            </div>

            <div class="capa-footer">
              <div class="capa-human-meta so-simples">
                <span class="capa-fast-read">⚡ Resumo de ${escaparHtml(tempoCapa)}</span>
                <span class="capa-jump-points">🎯 ${qtdCoords} ${qtdCoords === 1 ? "ponto" : "pontos"} para ir direto ao assunto</span>
              </div>
              <div class="capa-human-meta so-tecnico">
                <span class="capa-tokens-bar">
                  Capa: <strong>${tokCapa} tok</strong> vs. ${tokLivro.toLocaleString("pt-BR")}
                </span>
                <span class="capa-savings-pill">
                  -${economia}% · ${qtdCoords} alvos
                </span>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  async function renderizarColunaContracapa() {
    const livro = obterLivroPorId(estado.livroSelecionadoId);
    const elId = document.getElementById("ficha-id");
    const elTipoAmigavel = document.getElementById("ficha-tipo-amigavel");
    const elCaminhoCapa = document.getElementById("ficha-caminho-capa");
    const elAcoesHeader = document.getElementById("contracapa-acoes-header");
    const elTitulo = document.getElementById("ficha-titulo");
    const elSubtitulo = document.getElementById("ficha-subtitulo");
    const elEstadoVazioContracapa = document.getElementById("estado-vazio-contracapa");
    const elCardCta = document.getElementById("card-cta-livro-aberto");
    const blocoEstruturado = document.getElementById("ficha-conteudo-estruturado");
    const blocoMd = document.getElementById("ficha-conteudo-md");

    if (!livro) {
      if (elTipoAmigavel) elTipoAmigavel.hidden = true;
      if (elId) elId.hidden = true;
      if (elCaminhoCapa) elCaminhoCapa.hidden = true;
      if (elAcoesHeader) elAcoesHeader.hidden = true;
      if (elCardCta) elCardCta.hidden = true;
      if (blocoEstruturado) blocoEstruturado.hidden = true;
      if (blocoMd) blocoMd.hidden = true;
      if (elEstadoVazioContracapa) elEstadoVazioContracapa.hidden = false;
      if (elTitulo) elTitulo.textContent = "Resumo da Capa & Ir Direto ao Ponto";
      if (elSubtitulo) {
        elSubtitulo.textContent = "Selecione ou guarde um material para visualizar o resumo de 1 minuto.";
      }
      return;
    }

    if (elEstadoVazioContracapa) elEstadoVazioContracapa.hidden = true;
    if (elTipoAmigavel) elTipoAmigavel.hidden = false;
    if (elId) elId.hidden = false;
    if (elCaminhoCapa) elCaminhoCapa.hidden = false;
    if (elAcoesHeader) elAcoesHeader.hidden = false;
    if (elCardCta) elCardCta.hidden = false;

    const metaTipo = TIPOS_MIDIA_META[livro.tipo_principal] || TIPOS_MIDIA_META["pdf-livro"];
    const elCaminhoLivro = document.getElementById("ficha-caminho-livro");
    const elMetaArquivos = document.getElementById("ficha-meta-arquivos");
    const elExplicacaoLeiga = document.getElementById("ficha-explicacao-leiga");
    const elTempoPill = document.getElementById("ficha-tempo-pill");
    const elTokensBadge = document.getElementById("ficha-tokens-badge");
    const elResumo = document.getElementById("ficha-resumo");
    const elGatilhos = document.getElementById("ficha-gatilhos");
    const elCountCoords = document.getElementById("ficha-count-coordenadas");
    const elListaCoords = document.getElementById("lista-coordenadas");
    const elArquivosMini = document.getElementById("ficha-arquivos-mini");

    if (elId) elId.textContent = livro.id;
    if (elTipoAmigavel) elTipoAmigavel.textContent = metaTipo.rotulo;
    if (elCaminhoCapa) elCaminhoCapa.textContent = livro.caminho_capa;
    if (elTitulo) elTitulo.textContent = livro.titulo;
    if (elSubtitulo) elSubtitulo.textContent = livro.subtitulo;
    if (elCaminhoLivro) elCaminhoLivro.textContent = livro.caminho_livro_aberto;

    const qtdArq = ((livro.livro_aberto && livro.livro_aberto.arquivos) || []).length;
    const tempoCompleto = obterTempoMaterialCompleto(livro);
    if (elMetaArquivos) {
      elMetaArquivos.textContent =
        estado.modoExperiencia === "tecnico"
          ? `${qtdArq} arquivos · ${tempoCompleto} · ${(livro.tokens_livro_aberto_est || 18000).toLocaleString("pt-BR")} tok`
          : `📦 Material completo: ${tempoCompleto} (${qtdArq} ${qtdArq === 1 ? "arquivo" : "arquivos"} lá dentro)`;
    }

    if (elExplicacaoLeiga) {
      elExplicacaoLeiga.textContent = obterExplicacaoLeiga(livro);
    }
    if (elTempoPill) {
      elTempoPill.textContent = `⚡ Leitura de ${livro.tempo_leitura_capa || "1 min"}`;
    }
    if (elTokensBadge) {
      elTokensBadge.textContent = `Lido em ${livro.tokens_capa || 500} tokens`;
    }
    if (elResumo) {
      elResumo.innerHTML = formatarInlineCode(livro.resumo_capa);
    }

    if (elGatilhos) {
      elGatilhos.innerHTML = (livro.gatilhos || []).map((g) => (
        `<span class="gatilho-pill">✓ ${escaparHtml(g)}</span>`
      )).join("");
    }

    const coordenadas = (livro.coordenadas || []).map(normalizarCoordenada);
    if (elCountCoords) {
      elCountCoords.textContent = `${coordenadas.length} ${coordenadas.length === 1 ? "ponto" : "pontos"}`;
    }

    if (elListaCoords) {
      elListaCoords.innerHTML = coordenadas.map((coord, idx) => {
        const destacada = estado.coordenadaDestacadaIdx === idx;
        const prefixo = iconeParaTipoCoordenada(coord.tipo, coord.onde_amigavel);
        return `
          <button
            type="button"
            class="coordenada-btn ${destacada ? "is-highlighted" : ""}"
            data-coord-idx="${idx}"
            role="listitem"
            title="Ir direto para este ponto no Livro Aberto"
          >
            <div class="coord-top">
              <span class="coord-rotulo">${escaparHtml(coord.rotulo)}</span>
              <span class="coord-onde-pill">${escaparHtml(prefixo + coord.onde_amigavel)}</span>
              <span class="coord-alvo-pill so-tecnico">${escaparHtml(coord.alvo)}</span>
            </div>
            <div class="coord-bottom">
              <p class="coord-resumo">${escaparHtml(coord.resumo)}</p>
              <span class="coord-open-cta">Abrir neste ponto →</span>
            </div>
          </button>
        `;
      }).join("");
    }

    if (elArquivosMini) {
      const arquivos = (livro.livro_aberto && livro.livro_aberto.arquivos) || [];
      elArquivosMini.innerHTML = arquivos.map((arq, idx) => {
        const iconeArq =
          arq.tipo === "video"
            ? "🎬"
            : arq.tipo === "pdf"
            ? "📘"
            : arq.tipo === "imagem"
            ? "🖼️"
            : arq.tipo === "codigo"
            ? "💻"
            : "📄";
        return `
          <li class="arquivo-mini-item" data-abrir-arq-idx="${idx}" role="button" tabindex="0">
            <span class="arquivo-mini-nome">${iconeArq} ${escaparHtml(arq.nome)}</span>
            <span class="arquivo-mini-meta">Abrir arquivo →</span>
          </li>
        `;
      }).join("");
    }

    // Alternância entre Contracapa Estruturada e Markdown Puro da Capa
    const btnToggleMdCapa = document.getElementById("btn-toggle-md-capa");
    const codeMdCapa = document.getElementById("codigo-md-capa");

    if (blocoEstruturado && blocoMd) {
      blocoEstruturado.hidden = estado.modoMarkdownCapa;
      blocoMd.hidden = !estado.modoMarkdownCapa;
    }
    if (btnToggleMdCapa) {
      btnToggleMdCapa.setAttribute("aria-pressed", String(estado.modoMarkdownCapa));
    }
    if (estado.modoMarkdownCapa && codeMdCapa) {
      codeMdCapa.textContent = await obterConteudoMarkdownReal(
        livro.caminho_capa,
        () => gerarMarkdownCapaFallback(livro)
      );
    }
  }

  // ==========================================================================
  // ESTRUTURA 3: O LIVRO ABERTO MULTIMODAL E EXPLICADO PARA LEIGOS
  // ==========================================================================

  function resolverArquivoPorCoordenada(livro, coord) {
    const arquivos = (livro.livro_aberto && livro.livro_aberto.arquivos) || [];
    if (!coord || !arquivos.length) return { idx: 0, linhaInicio: null, linhaFim: null };

    const alvoTexto = `${coord.alvo} ${coord.arquivoSugerido || ""}`;
    let arquivoIdx = 0;

    arquivos.forEach((arq, idx) => {
      if (alvoTexto.toLowerCase().includes(arq.nome.toLowerCase())) {
        arquivoIdx = idx;
      }
    });

    const matchLinhas = alvoTexto.match(/:(\d+)-(\d+)/);
    const linhaInicio = matchLinhas ? parseInt(matchLinhas[1], 10) : null;
    const linhaFim = matchLinhas ? parseInt(matchLinhas[2], 10) : null;

    return { idx: arquivoIdx, linhaInicio, linhaFim };
  }

  function abrirLivroAberto(livroId, coordIdxOpcional = null, arquivoIdxOpcional = null) {
    const livro = obterLivroPorId(livroId || estado.livroSelecionadoId);
    if (!livro) return;

    estado.livroSelecionadoId = livro.id;
    estado.modalAberto = true;

    const coords = (livro.coordenadas || []).map(normalizarCoordenada);
    if (coordIdxOpcional !== null && coords[coordIdxOpcional]) {
      estado.coordenadaDestacadaIdx = coordIdxOpcional;
      estado.coordenadaModalAtiva = coords[coordIdxOpcional];
      const resolvido = resolverArquivoPorCoordenada(livro, estado.coordenadaModalAtiva);
      estado.arquivoModalIdx = resolvido.idx;
      estado.coordenadaModalAtiva.linhaInicio = resolvido.linhaInicio;
      estado.coordenadaModalAtiva.linhaFim = resolvido.linhaFim;
    } else {
      estado.coordenadaModalAtiva = null;
      estado.arquivoModalIdx = arquivoIdxOpcional !== null ? arquivoIdxOpcional : 0;
    }

    const modal = document.getElementById("modal-livro-aberto");
    if (modal) {
      modal.hidden = false;
    }

    renderizarModalLivroAberto();
    renderizarTelemetriaECaminho();
  }

  function fecharLivroAberto() {
    estado.modalAberto = false;
    const modal = document.getElementById("modal-livro-aberto");
    if (modal) {
      modal.hidden = true;
    }
    renderizarTelemetriaECaminho();
  }

  function renderizarModalLivroAberto() {
    const livro = obterLivroPorId(estado.livroSelecionadoId);
    if (!livro) return;

    const metaTipo = TIPOS_MIDIA_META[livro.tipo_principal] || TIPOS_MIDIA_META["pdf-livro"];
    const arquivos = (livro.livro_aberto && livro.livro_aberto.arquivos) || [];
    const arquivoAtual = arquivos[estado.arquivoModalIdx] || arquivos[0];

    const elId = document.getElementById("modal-livro-id");
    const elTipo = document.getElementById("modal-livro-tipo");
    const elCaminho = document.getElementById("modal-livro-caminho");
    const elCoordAtiva = document.getElementById("modal-coordenada-ativa");
    const elTitulo = document.getElementById("modal-livro-titulo");
    const elDesc = document.getElementById("modal-descricao-completa");

    if (elId) elId.textContent = livro.id;
    if (elTipo) elTipo.textContent = metaTipo.rotulo;
    if (elCaminho) elCaminho.textContent = livro.caminho_livro_aberto;
    if (elTitulo) elTitulo.textContent = livro.titulo;
    if (elDesc) elDesc.textContent = (livro.livro_aberto && livro.livro_aberto.descricao_completa) || livro.subtitulo;

    if (elCoordAtiva) {
      if (estado.coordenadaModalAtiva) {
        elCoordAtiva.hidden = false;
        elCoordAtiva.textContent = `🎯 Ponto aberto: ${estado.coordenadaModalAtiva.onde_amigavel}`;
      } else {
        elCoordAtiva.hidden = true;
      }
    }

    // Abas dos arquivos
    const abasEl = document.getElementById("abas-arquivos-livro");
    if (abasEl) {
      abasEl.innerHTML = arquivos.map((arq, idx) => {
        const ativo = idx === estado.arquivoModalIdx;
        return `
          <button
            type="button"
            role="tab"
            aria-selected="${ativo}"
            class="la-tab-btn ${ativo ? "is-active" : ""}"
            data-modal-arq-idx="${idx}"
          >
            <span>${escaparHtml(arq.nome)}</span>
          </button>
        `;
      }).join("");
    }

    // Sidebar de "Ir Direto ao Ponto" dentro do Livro Aberto
    const navCoords = document.getElementById("modal-lista-coordenadas");
    const coords = (livro.coordenadas || []).map(normalizarCoordenada);
    if (navCoords) {
      navCoords.innerHTML = coords.map((coord, idx) => {
        const ativo = estado.coordenadaModalAtiva && estado.coordenadaModalAtiva.alvo === coord.alvo;
        const prefixo = iconeParaTipoCoordenada(coord.tipo, coord.onde_amigavel);
        return `
          <button
            type="button"
            class="coordenada-btn ${ativo ? "is-highlighted" : ""}"
            data-modal-coord-idx="${idx}"
          >
            <div class="coord-top">
              <span class="coord-rotulo">${escaparHtml(coord.rotulo)}</span>
              <span class="coord-onde-pill">${escaparHtml(prefixo + coord.onde_amigavel)}</span>
            </div>
            <p class="coord-resumo">${escaparHtml(coord.resumo)}</p>
          </button>
        `;
      }).join("");
    }

    // Árvore de arquivos na sidebar
    const arvoreEl = document.getElementById("modal-arvore-arquivos");
    if (arvoreEl) {
      arvoreEl.innerHTML = arquivos.map((arq, idx) => {
        const ativo = idx === estado.arquivoModalIdx;
        return `
          <li
            class="arquivo-mini-item"
            style="${ativo ? "border-color: var(--accent-amber); background: var(--bg-active);" : ""}"
            data-modal-arq-idx="${idx}"
            role="button"
            tabindex="0"
          >
            <span class="arquivo-mini-nome">${escaparHtml(arq.nome)}</span>
            <span class="arquivo-mini-meta">${escaparHtml(arq.tamanho || "")}</span>
          </li>
        `;
      }).join("");
    }

    renderizarStageArquivo(livro, arquivoAtual);
  }

  function gerarBannerExplicacaoSimples(livro, coord) {
    const explicacao = obterExplicacaoLeiga(livro);
    const blocoCoord = coord
      ? `<p class="la-explicacao-tip">🎯 <strong>Você abriu direto em:</strong> ${escaparHtml(coord.rotulo)} (${escaparHtml(coord.onde_amigavel)}) — ${escaparHtml(coord.resumo)}</p>`
      : `<p class="la-explicacao-tip">👉 <strong>Como navegar:</strong> Use os botões de <em>"Ir Direto ao Ponto"</em> à esquerda ou troque de aba acima para explorar cada parte deste material sem precisar ler tudo de uma vez.</p>`;

    return `
      <div class="la-explicacao-simples-banner">
        <div class="la-explicacao-top">
          <span class="la-explicacao-title">💡 Explicação Simples deste Material</span>
          <span class="capa-full-time-pill">${escaparHtml(obterTempoMaterialCompleto(livro))}</span>
        </div>
        <p class="la-explicacao-text">${escaparHtml(explicacao)}</p>
        ${blocoCoord}
      </div>
    `;
  }

  function renderizarStageArquivo(livro, arquivo) {
    const stage = document.getElementById("modal-stage-container");
    if (!stage || !arquivo) return;

    const conteudo = arquivo.preview_conteudo || "";
    const coord = estado.coordenadaModalAtiva;
    const bannerTopo = gerarBannerExplicacaoSimples(livro, coord);

    // 1. Player Visual de Vídeo com Momentos-Chave (Capítulos em Minutos)
    if (livro.tipo_principal === "video" && arquivo.tipo === "video") {
      const timestamps = [
        { tempo: "00:00 - 02:14", titulo: "Enquadramento 9:16 Sem Bordas Pretas", metrica: "Centro vertical 0,48 · Tela Cheia" },
        { tempo: "02:15 - 05:10", titulo: "Corte de Pausas Sem Cortar Palavras", metrica: "Pausa real >= 80 ms · Folga 40 ms" },
        { tempo: "05:11 - 09:30", titulo: "Volume Nivelado e Som Limpo", metrica: "Padrão -14.0 LUFS · Zero Distorção" },
        { tempo: "09:31 - 14:20", titulo: "Detector de Cena Parada (Ritmo)", metrica: "Máximo parado <= 0,43 s" }
      ];
      const tsAtivo = timestamps[estado.timestampVideoAtivo] || timestamps[0];

      stage.innerHTML = `
        ${bannerTopo}
        <div class="video-inspector-wrap">
          <div class="video-stage-screen">
            <div class="video-frame-9x16">
              <div class="video-frame-hud-top">
                <span>9:16 Celular</span>
                <span>60 FPS</span>
              </div>
              <div class="video-frame-center">
                <span class="video-frame-time">${escaparHtml(tsAtivo.tempo)}</span>
                <p class="video-frame-caption">${escaparHtml(tsAtivo.titulo)}</p>
              </div>
              <div class="video-frame-hud-top">
                <span>-14.0 LUFS</span>
                <span>${escaparHtml(tsAtivo.metrica)}</span>
              </div>
            </div>

            <div class="video-timeline-bar">
              <h3 class="ficha-section-title">🎬 Capítulos do Vídeo (Clique para pular para o minuto)</h3>
              <p class="ficha-section-hint">Escolha um momento-chave abaixo para ver o que acontece naquele trecho da aula:</p>
              <div class="timeline-markers-row">
                ${timestamps.map((t, i) => `
                  <button type="button" class="timestamp-chip-btn ${i === estado.timestampVideoAtivo ? "is-active" : ""}" data-video-ts-idx="${i}">
                    <span class="video-time-pill">[${escaparHtml(t.tempo)}]</span>
                    <span>${escaparHtml(t.titulo)}</span>
                  </button>
                `).join("")}
              </div>
            </div>
          </div>

          <div class="code-viewer-card">
            <div class="code-viewer-bar">
              <span>Roteiro Completo e Anotações da Aula (${escaparHtml(arquivo.nome)})</span>
              <span>${escaparHtml(arquivo.tamanho || "")}</span>
            </div>
            <pre class="raw-md-pre" style="border:none; border-radius:0;"><code>${escaparHtml(conteudo)}</code></pre>
          </div>
        </div>
      `;
      return;
    }

    // 2. Galeria de Fotos / Pranchas SVG e Referências Visuais
    if (arquivo.tipo === "imagem" && conteudo.trim().startsWith("<svg")) {
      stage.innerHTML = `
        ${bannerTopo}
        <div class="gallery-grid">
          <div class="gallery-card is-highlighted" style="grid-column: 1 / -1;">
            <div class="code-viewer-bar">
              <span>🖼️ Ilustração Visual Ampliada: ${escaparHtml(arquivo.nome)}</span>
              <span>${escaparHtml(coord ? coord.onde_amigavel : "Visualização Completa")}</span>
            </div>
            <div class="gallery-preview-box" style="height: auto; padding: 16px; background: #0f1218;">
              ${conteudo}
            </div>
          </div>
        </div>
        ${gerarTabelaLinhasCodigo(arquivo, conteudo, coord)}
      `;
      return;
    }

    // 3. Leitor Editorial Confortável de Livro / PDF por Capítulos
    if (arquivo.tipo === "pdf") {
      const blocos = conteudo.split(/(?=^##\s+)/m);
      const alvoNorm = coord ? normalizarTexto(coord.alvo + " " + coord.onde_amigavel) : "";
      stage.innerHTML = `
        ${bannerTopo}
        <div class="pdf-reader-sheet">
          ${blocos.map((bloco) => {
            const normBloco = normalizarTexto(bloco);
            const destacar =
              (alvoNorm.includes("cap. 1") || alvoNorm.includes("capitulo 1")) && normBloco.includes("capitulo 1") ||
              (alvoNorm.includes("cap. 2") || alvoNorm.includes("capitulo 2")) && normBloco.includes("capitulo 2") ||
              (alvoNorm.includes("cap. 3") || alvoNorm.includes("capitulo 3")) && normBloco.includes("capitulo 3");
            return `<div class="pdf-chapter-block ${destacar ? "is-highlighted" : ""}"><pre style="white-space:pre-wrap; font-family: inherit;">${escaparHtml(bloco.trim())}</pre></div>`;
          }).join("")}
        </div>
      `;
      return;
    }

    // 4. Visualizador de Código / Texto com Faixa de Explicação Simples no Topo
    stage.innerHTML = `${bannerTopo}${gerarTabelaLinhasCodigo(arquivo, conteudo, coord)}`;

    const primeiraDestacada = stage.querySelector(".code-line-row.is-highlighted");
    if (primeiraDestacada) {
      primeiraDestacada.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }

  function gerarTabelaLinhasCodigo(arquivo, conteudo, coord) {
    const linhas = String(conteudo || "").split("\n");
    let inicio = coord && coord.linhaInicio ? coord.linhaInicio : null;
    let fim = coord && coord.linhaFim ? coord.linhaFim : null;

    if (!inicio && coord && coord.alvo) {
      const m = coord.alvo.match(/(\d+)-(\d+)/);
      if (m) {
        inicio = parseInt(m[1], 10);
        fim = parseInt(m[2], 10);
      }
    }

    const linhasHtml = linhas.map((textoLinha, i) => {
      const num = i + 1;
      const destacada = inicio !== null && fim !== null && num >= inicio && num <= fim;
      return `
        <tr class="code-line-row ${destacada ? "is-highlighted" : ""}" id="L${num}">
          <td class="code-line-num">${num}</td>
          <td class="code-line-text">${escaparHtml(textoLinha) || " "}</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="code-viewer-card">
        <div class="code-viewer-bar">
          <span>📄 ${escaparHtml(arquivo.nome)}</span>
          <span>${linhas.length} linhas · ${escaparHtml(arquivo.tamanho || "")}</span>
        </div>
        <table class="code-lines-table" aria-label="Conteúdo do arquivo numerado linha a linha">
          <tbody>
            ${linhasHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  // ==========================================================================
  // ROTEAMENTO ACOLHEDOR DO BIBLIOTECÁRIO
  // ==========================================================================

  function executarConsultaBibliotecario(textoConsulta, opcoesForcadas = null) {
    estado.termoBusca = textoConsulta;
    const input = document.getElementById("busca-input");
    const btnLimpar = document.getElementById("btn-limpar-busca");
    if (input && input.value !== textoConsulta) {
      input.value = textoConsulta;
    }
    if (btnLimpar) {
      btnLimpar.hidden = !textoConsulta.trim();
    }

    const banner = document.getElementById("resposta-bibliotecario");
    const resumoBanner = document.getElementById("answer-summary-text");
    const btnLabel = document.getElementById("btn-abrir-coordenada-label");

    if (!textoConsulta.trim()) {
      estado.coordenadaDestacadaIdx = null;
      if (banner) banner.hidden = true;
      renderizarTudo();
      return;
    }

    let melhorLivro = null;
    let melhorCoordIdx = 0;

    if (opcoesForcadas && opcoesForcadas.livroId) {
      melhorLivro = obterLivroPorId(opcoesForcadas.livroId);
      melhorCoordIdx = opcoesForcadas.coordIdx || 0;
    } else {
      let maiorScore = -1;
      for (const l of estado.catalogo.livros || []) {
        const av = pontuarLivro(l, textoConsulta);
        if (av.pontos > maiorScore) {
          maiorScore = av.pontos;
          melhorLivro = l;
          melhorCoordIdx = av.melhorCoordIdx;
        }
      }
    }

    if (melhorLivro) {
      estado.categoriaAtiva = "todas";
      estado.tipoMidiaAtivo = "todos";
      estado.livroSelecionadoId = melhorLivro.id;
      estado.coordenadaDestacadaIdx = melhorCoordIdx;

      const coords = (melhorLivro.coordenadas || []).map(normalizarCoordenada);
      const coordEscolhida = coords[melhorCoordIdx] || coords[0];
      const cat = obterCategoriaPorId(melhorLivro.categoria);

      if (banner && resumoBanner && coordEscolhida) {
        banner.hidden = false;
        if (estado.modoExperiencia === "tecnico") {
          const pct = ((1 - (melhorLivro.tokens_capa / melhorLivro.tokens_livro_aberto_est)) * 100)
            .toFixed(1)
            .replace(".", ",");
          resumoBanner.innerHTML = `Salto 1 (<code>INDICE_MASTER.md</code>) → Salto 2 (<code>categorias/${escaparHtml(melhorLivro.categoria)}.md</code>) → Salto 3 (<strong>${escaparHtml(melhorLivro.id)}</strong>, ${melhorLivro.tokens_capa} tok, <strong>-${pct}%</strong>) → Coordenada: <code>${escaparHtml(coordEscolhida.alvo)}</code> (${escaparHtml(coordEscolhida.rotulo)}).`;
        } else {
          resumoBanner.innerHTML = `Encontrei na estante <strong>${escaparHtml(cat ? cat.nome : "Principal")}</strong>: <strong>${escaparHtml(melhorLivro.titulo)}</strong>. Melhores instruções em <strong>${escaparHtml(coordEscolhida.onde_amigavel)}</strong> (<em>${escaparHtml(coordEscolhida.rotulo)}</em>).`;
        }
        if (btnLabel) {
          btnLabel.textContent = `Ir para ${coordEscolhida.onde_amigavel}`;
        }
      }
    }

    renderizarTudo();
  }

  // ==========================================================================
  // ONDA 3: ASSISTENTE VISUAL "+ GUARDAR NA BIBLIOTECA" (3 PASSOS)
  // ==========================================================================

  function popularSelectCategoriasGuardar(valorPreferido = null) {
    const select = document.getElementById("guardar-categoria");
    const wrapNova = document.getElementById("campo-nova-categoria-wrap");
    if (!select) return;

    const valorAtual = valorPreferido || select.value;
    const categorias = estado.catalogo.categorias || [];
    const opcoesHtml = categorias.map((cat) => {
      const icone = ICONES_CATEGORIA[cat.id] || "📂";
      return `<option value="${escaparHtml(cat.id)}">${icone} ${escaparHtml(cat.nome)}</option>`;
    });
    opcoesHtml.push(`<option value="__nova__">+ Criar nova estante personalizada...</option>`);
    select.innerHTML = opcoesHtml.join("");

    const valoresValidos = new Set(categorias.map((c) => c.id).concat(["__nova__"]));
    if (valorAtual && valoresValidos.has(valorAtual)) {
      select.value = valorAtual;
    } else if (categorias.length > 0) {
      select.value = categorias[0].id;
    }

    if (wrapNova) {
      wrapNova.hidden = select.value !== "__nova__";
    }
  }

  function abrirModalGuardar() {
    estado.modalGuardarAberto = true;
    popularSelectCategoriasGuardar();
    const modal = document.getElementById("modal-guardar-livro");
    if (modal) modal.hidden = false;
    const inpTitulo = document.getElementById("guardar-titulo");
    if (inpTitulo) inpTitulo.focus();
  }

  function fecharModalGuardar() {
    estado.modalGuardarAberto = false;
    const modal = document.getElementById("modal-guardar-livro");
    if (modal) modal.hidden = true;
  }

  function selecionarTipoGuardar(novoTipo) {
    const inputTipo = document.getElementById("guardar-tipo");
    if (inputTipo) inputTipo.value = novoTipo;

    document.querySelectorAll("#opcoes-tipo-guardar [data-guardar-tipo]").forEach((btn) => {
      const ativo = btn.getAttribute("data-guardar-tipo") === novoTipo;
      btn.classList.toggle("is-selected", ativo);
      btn.setAttribute("aria-pressed", String(ativo));
    });

    const inpTempo = document.getElementById("guardar-tempo-completo");
    const inpArq = document.getElementById("guardar-nome-arquivo");
    const selCat = document.getElementById("guardar-categoria");
    const wrapNova = document.getElementById("campo-nova-categoria-wrap");

    let catSugerida = null;
    if (novoTipo === "pdf-livro") {
      if (inpTempo) inpTempo.value = "32 páginas";
      if (inpArq) inpArq.value = "CAPITULOS_DO_LIVRO.md";
      catSugerida = "referencias-e-livros";
    } else if (novoTipo === "video") {
      if (inpTempo) inpTempo.value = "12 min de vídeo";
      if (inpArq) inpArq.value = "ROTEIRO_E_MINUTOS.md";
      catSugerida = "midia-e-motion";
    } else if (novoTipo === "fotos-ref") {
      if (inpTempo) inpTempo.value = "Galeria com 4 fotos";
      if (inpArq) inpArq.value = "ALBUM_REFERENCIAS.md";
      catSugerida = "midia-e-motion";
    } else if (novoTipo === "codigo-fonte") {
      if (inpTempo) inpTempo.value = "Projeto com 2 arquivos";
      if (inpArq) inpArq.value = "script_principal.py";
      catSugerida = "engenharia-e-codigo";
    } else {
      if (inpTempo) inpTempo.value = "Guia prático completo";
      if (inpArq) inpArq.value = "GUIA_COMPLETO.md";
    }

    if (selCat && catSugerida && selCat.value !== "__nova__" && obterCategoriaPorId(catSugerida)) {
      selCat.value = catSugerida;
      if (wrapNova) wrapNova.hidden = true;
    }
  }

  function adicionarLinhaPontoGuardar(rotulo = "", alvo = "", resumo = "") {
    const lista = document.getElementById("lista-pontos-guardar");
    if (!lista) return;
    const qtd = lista.querySelectorAll(".guardar-ponto-row").length;
    if (qtd >= 5) {
      mostrarToast("Você já adicionou 5 pontos rápidos.");
      return;
    }
    const div = document.createElement("div");
    div.className = "guardar-ponto-row";
    div.innerHTML = `
      <input type="text" class="guardar-input input-ponto-rotulo" placeholder="Nome do ponto (Ex: Parte 2)" value="${escaparHtml(rotulo)}" required>
      <input type="text" class="guardar-input input-ponto-alvo" placeholder="Onde fica? (Ex: Pág. 18 ou 04:15)" value="${escaparHtml(alvo)}" required>
      <input type="text" class="guardar-input input-ponto-resumo" placeholder="O que ensina lá?" value="${escaparHtml(resumo)}">
      <button type="button" class="btn-ghost-sm btn-remover-ponto" aria-label="Remover este ponto">✕</button>
    `;
    lista.appendChild(div);
  }

  function preencherExemploRapidoGuardar() {
    selecionarTipoGuardar("video");
    const elTit = document.getElementById("guardar-titulo");
    const elSub = document.getElementById("guardar-subtitulo");
    const elExp = document.getElementById("guardar-explicacao-leiga");
    const elRes = document.getElementById("guardar-resumo-capa");
    const elGat = document.getElementById("guardar-gatilhos");
    const elTempo = document.getElementById("guardar-tempo-completo");
    const elArq = document.getElementById("guardar-nome-arquivo");
    const elCont = document.getElementById("guardar-conteudo-arquivo");
    const lista = document.getElementById("lista-pontos-guardar");

    if (elTit) elTit.value = "Guia Prático: Iluminação Caseira com 2 Luzes para Gravar Aulas";
    if (elSub) elSub.value = "Como usar a janela e um abajur simples para deixar o vídeo nítido pelo celular";
    if (elExp) {
      elExp.value = "Ensina qualquer pessoa a gravar vídeos claros e sem sombra no rosto usando apenas uma luminária de mesa e a luz natural da janela.";
    }
    if (elRes) {
      elRes.value = "Posicione a luz principal a 45 graus do rosto (nunca de cima para baixo) e use uma parede clara ou folha branca do lado oposto para suavizar sombras. Trave a exposição da câmera do celular antes de começar a falar.";
    }
    if (elGat) elGat.value = "iluminar vídeo em casa, gravar aula no celular, tirar sombra do rosto";
    if (elTempo) elTempo.value = "10 min de vídeo";
    if (elArq) elArq.value = "ROTEIRO_ILUMINACAO.md";
    if (elCont) {
      elCont.value = "# Guia de Iluminação Caseira para Vídeos\n\n## [00:00 - 02:30] Posição da Luz Principal (45 Graus)\nColoque a luminária levemente acima da linha dos olhos e a 45 graus para o lado.\n\n## [02:31 - 05:45] Rebatedor Caseiro Sem Custo\nUse uma cartolina branca ou parede clara do lado oposto para preencher a sombra.\n\n## [05:46 - 10:00] Travar Foco e Brilho no Celular\nSegure o dedo na tela por 2 segundos até aparecer 'Bloqueio AE/AF'.";
    }
    if (lista) {
      lista.innerHTML = "";
      adicionarLinhaPontoGuardar("Posição da Luz Principal (45°)", "00:00-02:30", "Onde colocar a luminária para não criar sombra no nariz");
      adicionarLinhaPontoGuardar("Rebatedor com Folha Branca", "02:31-05:45", "Como suavizar o lado escuro do rosto sem comprar equipamento");
    }
    mostrarToast("Exemplo preenchido! Clique em 'Guardar na Biblioteca' para testar.");
  }

  function calcularProximoIdLivro() {
    const livros = estado.catalogo.livros || [];
    let maior = 0;
    for (const l of livros) {
      const m = String(l.id || "").match(/LIV-(\d+)/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maior) maior = n;
      }
    }
    return `LIV-${String(maior + 1).padStart(3, "0")}`;
  }

  async function processarEnvioGuardar(e) {
    e.preventDefault();

    const tipoPrincipal = (document.getElementById("guardar-tipo") || {}).value || "pdf-livro";
    const selCatValor = (document.getElementById("guardar-categoria") || {}).value || "referencias-e-livros";
    const inpNovaCat = document.getElementById("guardar-nova-categoria");
    const nomeNovaCat = inpNovaCat ? inpNovaCat.value.trim() : "";

    let categoria = selCatValor;
    let nomeCategoria = "";

    if (selCatValor === "__nova__") {
      if (!nomeNovaCat) {
        mostrarToast("Por favor, digite o nome da nova estante personalizada.");
        if (inpNovaCat) inpNovaCat.focus();
        return;
      }
      categoria =
        normalizarTexto(nomeNovaCat)
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "estante-personalizada";
      nomeCategoria = nomeNovaCat;
    } else {
      const catExistente = obterCategoriaPorId(selCatValor);
      nomeCategoria = catExistente ? catExistente.nome : "";
    }

    const tempoCompleto = ((document.getElementById("guardar-tempo-completo") || {}).value || "Material completo").trim();
    const titulo = ((document.getElementById("guardar-titulo") || {}).value || "").trim();
    const subtitulo = ((document.getElementById("guardar-subtitulo") || {}).value || "").trim() || "Material guardado pelo Assistente Visual da Biblioteca Simples";
    const explicacaoLeiga = ((document.getElementById("guardar-explicacao-leiga") || {}).value || "").trim();
    const resumoCapa = ((document.getElementById("guardar-resumo-capa") || {}).value || "").trim();
    const gatilhosBrutos = ((document.getElementById("guardar-gatilhos") || {}).value || "").trim();
    const nomeArquivo = ((document.getElementById("guardar-nome-arquivo") || {}).value || "CONTEUDO_COMPLETO.md").trim();
    const conteudoArquivo = ((document.getElementById("guardar-conteudo-arquivo") || {}).value || "").trim() || `# ${titulo}\n\n${explicacaoLeiga}\n\n## Resumo\n${resumoCapa}`;

    if (!titulo || !explicacaoLeiga || !resumoCapa) {
      mostrarToast("Por favor, preencha o Título, Para que serve e o Resumo.");
      return;
    }

    const tipoCoordPadrao =
      tipoPrincipal === "video"
        ? "video"
        : tipoPrincipal === "pdf-livro"
        ? "pdf"
        : tipoPrincipal === "fotos-ref"
        ? "imagem"
        : tipoPrincipal === "codigo-fonte"
        ? "codigo"
        : "doc";

    const coordenadas = [];
    document.querySelectorAll("#lista-pontos-guardar .guardar-ponto-row").forEach((row) => {
      const rot = (row.querySelector(".input-ponto-rotulo") || {}).value || "";
      const alv = (row.querySelector(".input-ponto-alvo") || {}).value || "";
      const res = (row.querySelector(".input-ponto-resumo") || {}).value || "";
      if (rot.trim() || alv.trim()) {
        const alvoFinal = alv.trim() || `${nomeArquivo}:1-20`;
        coordenadas.push({
          rotulo: rot.trim() || "Ponto Principal",
          alvo: alvoFinal,
          tipo: tipoCoordPadrao,
          onde_amigavel: traduzirAlvoAmigavel(alvoFinal, tipoCoordPadrao),
          resumo: res.trim() || "Acesso direto a este trecho no Livro Aberto."
        });
      }
    });

    if (coordenadas.length === 0) {
      coordenadas.push({
        rotulo: "Conteúdo Principal",
        alvo: `${nomeArquivo}:1-30`,
        tipo: tipoCoordPadrao,
        onde_amigavel: traduzirAlvoAmigavel(`${nomeArquivo}:1-30`, tipoCoordPadrao),
        resumo: explicacaoLeiga
      });
    }

    const gatilhos = gatilhosBrutos
      ? gatilhosBrutos.split(",").map((s) => s.trim()).filter(Boolean)
      : [titulo.toLowerCase()];

    const payload = {
      titulo,
      subtitulo,
      categoria,
      nome_categoria: nomeCategoria,
      tipo_principal: tipoPrincipal,
      explicacao_leiga: explicacaoLeiga,
      tempo_leitura_capa: "1 min",
      tempo_material_completo: tempoCompleto,
      resumo_capa: resumoCapa,
      tags: [tipoPrincipal, categoria],
      gatilhos,
      coordenadas,
      nome_arquivo: nomeArquivo,
      conteudo_arquivo: conteudoArquivo
    };

    // 1. Tenta salvar no disco via POST /api/guardar (quando o servidor Python está rodando)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2200);
      const resp = await fetch("/api/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (resp.ok) {
        const dados = await resp.json();
        if (dados && dados.ok && dados.catalogo) {
          estado.catalogo = dados.catalogo;
          mesclarLivrosLocaisAoCatalogo();
          estado.categoriaAtiva = "todas";
          estado.tipoMidiaAtivo = "todos";
          estado.livroSelecionadoId = dados.id || estado.livroSelecionadoId;
          estado.abaMobileAtiva = "contracapa";
          if (inpNovaCat) inpNovaCat.value = "";
          popularSelectCategoriasGuardar(categoria);
          fecharModalGuardar();
          renderizarTudo();
          mostrarToast(`✓ Material guardado no disco (${dados.id})!`);
          return;
        }
      }
    } catch (_err) {
      // Sem servidor Python ativo: salva instantaneamente em memória + localStorage
    }

    // 2. Fallback imediato sem servidor (file:// ou estático): salva na memória + localStorage
    if (!obterCategoriaPorId(categoria)) {
      estado.catalogo.categorias.push({
        id: categoria,
        nome: nomeCategoria || categoria,
        descricao: `Materiais e referências catalogados na estante ${nomeCategoria || categoria}.`,
        total: 0
      });
    }

    const novoId = calcularProximoIdLivro();
    const metaTipo = TIPOS_MIDIA_META[tipoPrincipal] || TIPOS_MIDIA_META["pdf-livro"];
    const tipoArq =
      tipoPrincipal === "video"
        ? "video"
        : tipoPrincipal === "pdf-livro"
        ? "pdf"
        : tipoPrincipal === "fotos-ref"
        ? "imagem"
        : tipoPrincipal === "codigo-fonte"
        ? "codigo"
        : "markdown";

    const novoLivro = {
      id: novoId,
      titulo,
      subtitulo,
      explicacao_leiga: explicacaoLeiga,
      tempo_leitura_capa: "1 min",
      tempo_material_completo: tempoCompleto,
      categoria,
      nome_categoria: nomeCategoria,
      tipo_principal: tipoPrincipal,
      tags: [tipoPrincipal, categoria],
      gatilhos,
      cor_capa: metaTipo.cor,
      resumo_capa: resumoCapa,
      tokens_capa: Math.max(180, Math.round(resumoCapa.length / 3)),
      tokens_livro_aberto_est: Math.max(4500, conteudoArquivo.length * 4),
      caminho_capa: `capas/${novoId}_material-guardado.md`,
      caminho_livro_aberto: `livros_abertos/${novoId}/`,
      coordenadas,
      livro_aberto: {
        descricao_completa: explicacaoLeiga,
        arquivos: [
          {
            nome: nomeArquivo,
            tipo: tipoArq,
            tamanho: `${Math.max(1, Math.round(conteudoArquivo.length / 1024))} KB`,
            caminho: `livros_abertos/${novoId}/${nomeArquivo}`,
            preview_conteudo: conteudoArquivo
          }
        ]
      }
    };

    estado.catalogo.livros.push(novoLivro);
    salvarLivroLocalNoStorage(novoLivro);
    recalcularTotaisCategorias();

    estado.categoriaAtiva = "todas";
    estado.tipoMidiaAtivo = "todos";
    estado.livroSelecionadoId = novoId;
    estado.coordenadaDestacadaIdx = 0;
    estado.abaMobileAtiva = "contracapa";

    if (inpNovaCat) inpNovaCat.value = "";
    popularSelectCategoriasGuardar(categoria);
    fecharModalGuardar();
    renderizarTudo();
    mostrarToast(`✓ "${titulo}" guardado na sua Biblioteca!`);
  }

  function mostrarToast(mensagem) {
    const toast = document.getElementById("toast-feedback");
    if (!toast) return;
    toast.textContent = mensagem;
    toast.hidden = false;
    clearTimeout(mostrarToast._timer);
    mostrarToast._timer = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }

  async function copiarTexto(texto, descricao) {
    try {
      await navigator.clipboard.writeText(texto);
      mostrarToast(`Copiado: ${descricao}`);
    } catch (_e) {
      mostrarToast(`${descricao}: ${texto}`);
    }
  }

  function renderizarTudo() {
    atualizarModoExperienciaDOM();
    renderizarPerguntasRapidas();
    renderizarTelemetriaECaminho();
    renderizarColunaMaster();
    renderizarColunaCapas();
    renderizarColunaContracapa();
    popularSelectCategoriasGuardar();

    document.querySelectorAll("#filtros-midia .filter-chip").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-tipo") === estado.tipoMidiaAtivo);
    });

    const grid = document.getElementById("biblioteca-grid");
    if (grid) {
      grid.setAttribute("data-active-mobile-col", estado.abaMobileAtiva);
    }
    document.querySelectorAll("#mobile-col-tabs .mobile-tab-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-col") === estado.abaMobileAtiva);
    });
  }

  // ==========================================================================
  // EVENT LISTENERS E ATALHOS DE TECLADO
  // ==========================================================================

  function registrarEventos() {
    const inputBusca = document.getElementById("busca-input");
    const btnLimpar = document.getElementById("btn-limpar-busca");
    const btnPerguntar = document.getElementById("btn-perguntar");

    let timerDebounce = null;
    if (inputBusca) {
      inputBusca.addEventListener("input", (e) => {
        const valor = e.target.value;
        if (btnLimpar) btnLimpar.hidden = !valor.trim();
        clearTimeout(timerDebounce);
        timerDebounce = setTimeout(() => {
          executarConsultaBibliotecario(valor);
        }, 180);
      });

      inputBusca.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          clearTimeout(timerDebounce);
          executarConsultaBibliotecario(inputBusca.value);
        }
      });
    }

    if (btnPerguntar && inputBusca) {
      btnPerguntar.addEventListener("click", () => {
        executarConsultaBibliotecario(inputBusca.value);
      });
    }

    if (btnLimpar && inputBusca) {
      btnLimpar.addEventListener("click", () => {
        inputBusca.value = "";
        executarConsultaBibliotecario("");
        inputBusca.focus();
      });
    }

    // Sugestões de perguntas em linguagem natural (ou pílula de Instalação Limpa)
    const containerPerguntas = document.getElementById("perguntas-rapidas");
    if (containerPerguntas) {
      containerPerguntas.addEventListener("click", (e) => {
        const btnGuardar = e.target.closest("[data-acao-guardar]");
        if (btnGuardar) {
          abrirModalGuardar();
          return;
        }
        const chip = e.target.closest("[data-pergunta-idx]");
        if (!chip) return;
        const idx = parseInt(chip.getAttribute("data-pergunta-idx"), 10);
        const sugestoes = obterPerguntasSugeridas();
        const item = sugestoes[idx];
        if (item) {
          executarConsultaBibliotecario(item.pergunta, item);
        }
      });
    }

    // Faixa "Comece por aqui · Destaques da Biblioteca" (ou Guia de Instalação Limpa) na Coluna 2
    const faixaDestaques = document.getElementById("faixa-destaques-biblioteca");
    if (faixaDestaques) {
      faixaDestaques.addEventListener("click", (e) => {
        const btnGuardar = e.target.closest("[data-acao-guardar]");
        if (btnGuardar) {
          abrirModalGuardar();
          return;
        }
        const card = e.target.closest("[data-destaque-livro]");
        if (!card) return;
        const livroId = card.getAttribute("data-destaque-livro");
        const coordIdx = parseInt(card.getAttribute("data-destaque-coord") || "0", 10);
        estado.categoriaAtiva = "todas";
        estado.tipoMidiaAtivo = "todos";
        estado.livroSelecionadoId = livroId;
        estado.coordenadaDestacadaIdx = coordIdx;
        estado.abaMobileAtiva = "contracapa";
        renderizarTudo();
        mostrarToast("Resumo aberto na Coluna 3! Clique num ponto para abrir o material.");
      });
    }

    // Painel "Visão Geral do Acervo" na Coluna 1
    const painelAcervo = document.getElementById("painel-visao-geral-acervo");
    if (painelAcervo) {
      painelAcervo.addEventListener("click", (e) => {
        const card = e.target.closest("[data-acervo-filtro]");
        if (!card) return;
        const filtro = card.getAttribute("data-acervo-filtro");
        estado.tipoMidiaAtivo = estado.tipoMidiaAtivo === filtro ? "todos" : filtro;
        estado.abaMobileAtiva = "capas";
        renderizarTudo();
      });
    }

    // Banner do Bibliotecário: Abrir ponto sugerido
    const btnAbrirSugerida = document.getElementById("btn-abrir-coordenada-sugerida");
    if (btnAbrirSugerida) {
      btnAbrirSugerida.addEventListener("click", () => {
        abrirLivroAberto(estado.livroSelecionadoId, estado.coordenadaDestacadaIdx || 0);
      });
    }

    const btnFecharResposta = document.getElementById("btn-fechar-resposta");
    if (btnFecharResposta) {
      btnFecharResposta.addEventListener("click", () => {
        const banner = document.getElementById("resposta-bibliotecario");
        if (banner) banner.hidden = true;
      });
    }

    // Filtros por tipo de mídia
    const navMidia = document.getElementById("filtros-midia");
    if (navMidia) {
      navMidia.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-tipo]");
        if (!btn) return;
        estado.tipoMidiaAtivo = btn.getAttribute("data-tipo");
        renderizarTudo();
      });
    }

    // Trilha Visual Humana de 3 Passos
    const trilhaSaltos = document.getElementById("caminho-saltos");
    if (trilhaSaltos) {
      trilhaSaltos.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-salto]");
        if (!btn) return;
        const salto = btn.getAttribute("data-salto");
        if (salto === "coordenada" || (salto === "capa" && estado.modoExperiencia === "simples")) {
          abrirLivroAberto(estado.livroSelecionadoId, estado.coordenadaDestacadaIdx || 0);
        } else if (estado.modoExperiencia === "tecnico") {
          estado.modoMarkdownMaster = true;
          const select = document.getElementById("select-md-arquivo");
          if (select) select.value = salto;
          estado.abaMobileAtiva = "master";
          renderizarTudo();
        } else {
          estado.abaMobileAtiva = salto === "master" ? "master" : "capas";
          renderizarTudo();
        }
      });
    }

    // Coluna 1: Seleção de Estante
    const listaCategorias = document.getElementById("lista-categorias");
    if (listaCategorias) {
      listaCategorias.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-cat-id]");
        if (!btn) return;
        estado.categoriaAtiva = btn.getAttribute("data-cat-id");
        estado.abaMobileAtiva = "capas";
        renderizarTudo();
      });
    }

    // Alternância Visão Estante vs Markdown Puro (Modo Técnico)
    const tabEstante = document.getElementById("tab-visao-estante");
    const tabMd = document.getElementById("tab-visao-md");
    const btnGlobalMd = document.getElementById("btn-modo-markdown");
    const selectMd = document.getElementById("select-md-arquivo");

    if (tabEstante) {
      tabEstante.addEventListener("click", () => {
        estado.modoMarkdownMaster = false;
        renderizarColunaMaster();
      });
    }
    if (tabMd) {
      tabMd.addEventListener("click", () => {
        estado.modoMarkdownMaster = true;
        renderizarColunaMaster();
      });
    }
    if (btnGlobalMd) {
      btnGlobalMd.addEventListener("click", () => {
        estado.modoMarkdownMaster = !estado.modoMarkdownMaster;
        if (estado.modoMarkdownMaster) {
          estado.abaMobileAtiva = "master";
        }
        renderizarTudo();
      });
    }
    if (selectMd) {
      selectMd.addEventListener("change", () => {
        atualizarPreviewMarkdownMaster();
      });
    }

    const btnCopiarMdMaster = document.getElementById("btn-copiar-md-master");
    if (btnCopiarMdMaster) {
      btnCopiarMdMaster.addEventListener("click", () => {
        const codeEl = document.getElementById("codigo-md-master");
        if (codeEl) copiarTexto(codeEl.textContent, "Arquivo Markdown");
      });
    }

    // Coluna 2: Clique em uma Capa
    const gradeCapas = document.getElementById("grade-capas");
    if (gradeCapas) {
      gradeCapas.addEventListener("click", (e) => {
        const card = e.target.closest("[data-livro-id]");
        if (!card) return;
        estado.livroSelecionadoId = card.getAttribute("data-livro-id");
        estado.coordenadaDestacadaIdx = null;
        estado.abaMobileAtiva = "contracapa";
        renderizarTudo();
      });

      gradeCapas.addEventListener("keydown", (e) => {
        const card = e.target.closest("[data-livro-id]");
        if (!card) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          estado.livroSelecionadoId = card.getAttribute("data-livro-id");
          estado.abaMobileAtiva = "contracapa";
          renderizarTudo();
        }
      });
    }

    const btnResetFiltros = document.getElementById("btn-resetar-filtros");
    if (btnResetFiltros) {
      btnResetFiltros.addEventListener("click", () => {
        estado.categoriaAtiva = "todas";
        estado.tipoMidiaAtivo = "todos";
        executarConsultaBibliotecario("");
      });
    }

    // Coluna 3: Ações da Contracapa e "Ir Direto ao Ponto"
    const btnAbrirLivro = document.getElementById("btn-abrir-livro-aberto");
    if (btnAbrirLivro) {
      btnAbrirLivro.addEventListener("click", () => {
        abrirLivroAberto(estado.livroSelecionadoId, estado.coordenadaDestacadaIdx);
      });
    }

    const listaCoords = document.getElementById("lista-coordenadas");
    if (listaCoords) {
      listaCoords.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-coord-idx]");
        if (!btn) return;
        const idx = parseInt(btn.getAttribute("data-coord-idx"), 10);
        abrirLivroAberto(estado.livroSelecionadoId, idx);
      });
    }

    const listaArqMini = document.getElementById("ficha-arquivos-mini");
    if (listaArqMini) {
      listaArqMini.addEventListener("click", (e) => {
        const item = e.target.closest("[data-abrir-arq-idx]");
        if (!item) return;
        const idx = parseInt(item.getAttribute("data-abrir-arq-idx"), 10);
        abrirLivroAberto(estado.livroSelecionadoId, null, idx);
      });
    }

    const btnCopiarCaminhoCapa = document.getElementById("btn-copiar-caminho-capa");
    if (btnCopiarCaminhoCapa) {
      btnCopiarCaminhoCapa.addEventListener("click", () => {
        const livro = obterLivroPorId(estado.livroSelecionadoId);
        if (livro) copiarTexto(livro.caminho_capa, "Caminho da Capa");
      });
    }

    const btnToggleMdCapa = document.getElementById("btn-toggle-md-capa");
    if (btnToggleMdCapa) {
      btnToggleMdCapa.addEventListener("click", () => {
        estado.modoMarkdownCapa = !estado.modoMarkdownCapa;
        renderizarColunaContracapa();
      });
    }

    // Gaveta Lateral Direita (Ajuda & Modo Avançado / Switch Modo Técnico)
    const btnToggleRail = document.getElementById("btn-toggle-rail");
    const btnFecharRail = document.getElementById("btn-fechar-rail");
    const railDireito = document.getElementById("rail-direito");
    const switchModoTecnico = document.getElementById("switch-modo-tecnico");

    function alternarRail(forcarEstado) {
      estado.railDireitaAberta =
        typeof forcarEstado === "boolean" ? forcarEstado : !estado.railDireitaAberta;
      if (railDireito) railDireito.hidden = !estado.railDireitaAberta;
      if (btnToggleRail) btnToggleRail.setAttribute("aria-expanded", String(estado.railDireitaAberta));
    }

    if (btnToggleRail) {
      btnToggleRail.addEventListener("click", () => alternarRail());
    }
    if (btnFecharRail) {
      btnFecharRail.addEventListener("click", () => alternarRail(false));
    }

    if (switchModoTecnico) {
      switchModoTecnico.addEventListener("change", (e) => {
        estado.modoExperiencia = e.target.checked ? "tecnico" : "simples";
        renderizarTudo();
        mostrarToast(
          estado.modoExperiencia === "tecnico"
            ? "Modo Técnico / IA ativado (tokens, .md e CLI visíveis)"
            : "Modo Simples ativado (linguagem 100% humana)"
        );
      });
    }

    document.querySelectorAll("[data-copy-cmd]").forEach((btn) => {
      btn.addEventListener("click", () => {
        copiarTexto(btn.getAttribute("data-copy-cmd"), "Comando do terminal");
      });
    });

    // Tema Claro / Escuro
    const btnTema = document.getElementById("btn-tema");
    if (btnTema) {
      btnTema.addEventListener("click", () => {
        const atual = document.documentElement.getAttribute("data-theme") || "dark";
        const novo = atual === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", novo);
        mostrarToast(novo === "dark" ? "Tema Escuro ativado" : "Tema Papel Claro ativado");
      });
    }

    // Abas Mobile (375px)
    const navMobile = document.getElementById("mobile-col-tabs");
    if (navMobile) {
      navMobile.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-col]");
        if (!btn) return;
        estado.abaMobileAtiva = btn.getAttribute("data-col");
        renderizarTudo();
      });
    }

    // Modal 1: O Livro Aberto
    const btnFecharModal = document.getElementById("btn-fechar-livro-aberto");
    const modalBackdrop = document.getElementById("modal-livro-aberto");

    if (btnFecharModal) {
      btnFecharModal.addEventListener("click", fecharLivroAberto);
    }
    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", (e) => {
        if (e.target === modalBackdrop) fecharLivroAberto();
      });
    }

    const abasArquivos = document.getElementById("abas-arquivos-livro");
    if (abasArquivos) {
      abasArquivos.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-modal-arq-idx]");
        if (!btn) return;
        estado.arquivoModalIdx = parseInt(btn.getAttribute("data-modal-arq-idx"), 10);
        renderizarModalLivroAberto();
      });
    }

    const arvoreModal = document.getElementById("modal-arvore-arquivos");
    if (arvoreModal) {
      arvoreModal.addEventListener("click", (e) => {
        const item = e.target.closest("[data-modal-arq-idx]");
        if (!item) return;
        estado.arquivoModalIdx = parseInt(item.getAttribute("data-modal-arq-idx"), 10);
        renderizarModalLivroAberto();
      });
    }

    const coordsModal = document.getElementById("modal-lista-coordenadas");
    if (coordsModal) {
      coordsModal.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-modal-coord-idx]");
        if (!btn) return;
        const idx = parseInt(btn.getAttribute("data-modal-coord-idx"), 10);
        abrirLivroAberto(estado.livroSelecionadoId, idx);
      });
    }

    const stageModal = document.getElementById("modal-stage-container");
    if (stageModal) {
      stageModal.addEventListener("click", (e) => {
        const tsBtn = e.target.closest("[data-video-ts-idx]");
        if (!tsBtn) return;
        estado.timestampVideoAtivo = parseInt(tsBtn.getAttribute("data-video-ts-idx"), 10);
        renderizarModalLivroAberto();
      });
    }

    const btnCopiarConteudoArq = document.getElementById("btn-copiar-conteudo-arquivo");
    if (btnCopiarConteudoArq) {
      btnCopiarConteudoArq.addEventListener("click", () => {
        const livro = obterLivroPorId(estado.livroSelecionadoId);
        const arq = ((livro && livro.livro_aberto && livro.livro_aberto.arquivos) || [])[estado.arquivoModalIdx];
        if (arq) copiarTexto(arq.preview_conteudo, `Conteúdo de ${arq.nome}`);
      });
    }

    const btnCopiarCaminhoArq = document.getElementById("btn-copiar-caminho-arquivo");
    if (btnCopiarCaminhoArq) {
      btnCopiarCaminhoArq.addEventListener("click", () => {
        const livro = obterLivroPorId(estado.livroSelecionadoId);
        const arq = ((livro && livro.livro_aberto && livro.livro_aberto.arquivos) || [])[estado.arquivoModalIdx];
        if (arq) copiarTexto(arq.caminho, `Caminho de ${arq.nome}`);
      });
    }

    const btnCopiarPacote = document.getElementById("btn-copiar-caminho-pacote");
    if (btnCopiarPacote) {
      btnCopiarPacote.addEventListener("click", () => {
        const livro = obterLivroPorId(estado.livroSelecionadoId);
        if (livro) copiarTexto(livro.caminho_livro_aberto, "Caminho da pasta");
      });
    }

    // Modal 2: Assistente Visual "+ Guardar na Biblioteca"
    const btnAbrirGuardar = document.getElementById("btn-abrir-guardar");
    const btnGuardarPrimeiroVazio = document.getElementById("btn-guardar-primeiro-vazio");
    const btnGuardarContracapaVazia = document.getElementById("btn-guardar-contracapa-vazia");
    const btnFecharGuardar = document.getElementById("btn-fechar-modal-guardar");
    const btnCancelarGuardar = document.getElementById("btn-cancelar-guardar");
    const modalGuardarBackdrop = document.getElementById("modal-guardar-livro");
    const opcoesTipoGuardar = document.getElementById("opcoes-tipo-guardar");
    const selCategoriaGuardar = document.getElementById("guardar-categoria");
    const btnAddPonto = document.getElementById("btn-add-ponto-guardar");
    const listaPontosGuardar = document.getElementById("lista-pontos-guardar");
    const btnExemploGuardar = document.getElementById("btn-preencher-exemplo-guardar");
    const formGuardar = document.getElementById("form-guardar-livro");

    if (btnAbrirGuardar) {
      btnAbrirGuardar.addEventListener("click", abrirModalGuardar);
    }
    if (btnGuardarPrimeiroVazio) {
      btnGuardarPrimeiroVazio.addEventListener("click", abrirModalGuardar);
    }
    if (btnGuardarContracapaVazia) {
      btnGuardarContracapaVazia.addEventListener("click", abrirModalGuardar);
    }
    if (selCategoriaGuardar) {
      selCategoriaGuardar.addEventListener("change", () => {
        const wrapNova = document.getElementById("campo-nova-categoria-wrap");
        const inpNova = document.getElementById("guardar-nova-categoria");
        const ehNova = selCategoriaGuardar.value === "__nova__";
        if (wrapNova) wrapNova.hidden = !ehNova;
        if (ehNova && inpNova) inpNova.focus();
      });
    }
    if (btnFecharGuardar) {
      btnFecharGuardar.addEventListener("click", fecharModalGuardar);
    }
    if (btnCancelarGuardar) {
      btnCancelarGuardar.addEventListener("click", fecharModalGuardar);
    }
    if (modalGuardarBackdrop) {
      modalGuardarBackdrop.addEventListener("click", (e) => {
        if (e.target === modalGuardarBackdrop) fecharModalGuardar();
      });
    }
    if (opcoesTipoGuardar) {
      opcoesTipoGuardar.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-guardar-tipo]");
        if (!btn) return;
        selecionarTipoGuardar(btn.getAttribute("data-guardar-tipo"));
      });
    }
    if (btnAddPonto) {
      btnAddPonto.addEventListener("click", () => adicionarLinhaPontoGuardar());
    }
    if (listaPontosGuardar) {
      listaPontosGuardar.addEventListener("click", (e) => {
        const btnRem = e.target.closest(".btn-remover-ponto");
        if (!btnRem) return;
        const row = btnRem.closest(".guardar-ponto-row");
        if (row && listaPontosGuardar.querySelectorAll(".guardar-ponto-row").length > 1) {
          row.remove();
        }
      });
    }
    if (btnExemploGuardar) {
      btnExemploGuardar.addEventListener("click", preencherExemploRapidoGuardar);
    }
    if (formGuardar) {
      formGuardar.addEventListener("submit", processarEnvioGuardar);
    }

    // Atalhos Globais de Teclado (Ctrl+K, /, Esc, Setas, M)
    document.addEventListener("keydown", (e) => {
      const tag = (e.target && e.target.tagName) || "";
      const digitando = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (estado.modalAberto) fecharLivroAberto();
        if (estado.modalGuardarAberto) fecharModalGuardar();
        if (inputBusca) {
          inputBusca.focus();
          inputBusca.select();
        }
        return;
      }

      if (e.key === "/" && !digitando && !estado.modalAberto && !estado.modalGuardarAberto) {
        e.preventDefault();
        if (inputBusca) inputBusca.focus();
        return;
      }

      if (e.key === "Escape") {
        if (estado.modalGuardarAberto) {
          e.preventDefault();
          fecharModalGuardar();
          return;
        }
        if (estado.modalAberto) {
          e.preventDefault();
          fecharLivroAberto();
          return;
        }
        if (estado.railDireitaAberta) {
          e.preventDefault();
          alternarRail(false);
          return;
        }
        if (estado.termoBusca) {
          e.preventDefault();
          executarConsultaBibliotecario("");
          return;
        }
      }

      if (!digitando && !estado.modalAberto && !estado.modalGuardarAberto) {
        if (e.key.toLowerCase() === "m" && estado.modoExperiencia === "tecnico") {
          e.preventDefault();
          estado.modoMarkdownMaster = !estado.modoMarkdownMaster;
          renderizarTudo();
          return;
        }

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          const visiveis = obterLivrosVisiveis();
          if (!visiveis.length) return;
          e.preventDefault();
          const idxAtual = visiveis.findIndex((l) => l.id === estado.livroSelecionadoId);
          const delta = e.key === "ArrowDown" ? 1 : -1;
          const novoIdx = (idxAtual + delta + visiveis.length) % visiveis.length;
          estado.livroSelecionadoId = visiveis[novoIdx].id;
          estado.coordenadaDestacadaIdx = null;
          renderizarTudo();
        }
      }
    });
  }

  // Inicialização imediata
  registrarEventos();
  renderizarTudo();
  carregarCatalogoInicial();
})();
