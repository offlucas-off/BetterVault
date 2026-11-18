#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bibliotecario.py — Motor Determinístico do BetterVault (Biblioteca de 3 Estruturas)
Comandos:
  python bibliotecario.py sincronizar
  python bibliotecario.py buscar "<termo>"
  python bibliotecario.py catalogar --titulo "..." --categoria engenharia-e-codigo --tipo codigo-fonte
  python bibliotecario.py servir --porta 4325
  python bibliotecario.py testar
"""

import argparse
import json
import mimetypes
import os
import re
import shutil
import sys
import time
import unicodedata
from datetime import datetime, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import unquote, urlparse

RAIZ = Path(__file__).resolve().parent
DIR_CATEGORIAS = RAIZ / "categorias"
DIR_CAPAS = RAIZ / "capas"
DIR_LIVROS_ABERTOS = RAIZ / "livros_abertos"
ARQ_MASTER = RAIZ / "INDICE_MASTER.md"
ARQ_CATALOGO = RAIZ / "catalogo.json"

DEFINICAO_CATEGORIAS: List[Dict[str, str]] = [
    {
        "id": "engenharia-e-codigo",
        "nome": "Engenharia & Código",
        "descricao": "Projetos de software, scripts, arquitetura de sistemas, automações, APIs e repositórios de código.",
    },
    {
        "id": "midia-e-motion",
        "nome": "Mídia, Vídeo & Motion",
        "descricao": "Vídeos com capítulos em minutos, roteiros, edição audiovisual, design, animações e galerias de referência visual.",
    },
    {
        "id": "referencias-e-livros",
        "nome": "Referências, Livros & Estudos",
        "descricao": "Livros digitais, artigos, PDFs divididos por capítulo, manuais técnicos, pesquisas e notas de estudo.",
    },
]

CORES_POR_TIPO: Dict[str, str] = {
    "codigo-fonte": "#10b981",
    "github-repo": "#6366f1",
    "video": "#f59e0b",
    "fotos-ref": "#ec4899",
    "pdf-livro": "#0ea5e9",
    "pacote-misto": "#8b5cf6",
}

TEMPO_PADRAO_POR_TIPO: Dict[str, str] = {
    "codigo-fonte": "Projeto de código",
    "github-repo": "Repositório completo",
    "video": "15 min de vídeo",
    "fotos-ref": "Galeria visual",
    "pdf-livro": "48 páginas",
    "pacote-misto": "Pacote completo",
}

EXTENSOES_TEXTO = {
    ".md", ".py", ".json", ".jsonl", ".js", ".ts", ".sh", ".svg",
    ".css", ".yaml", ".yml", ".html", ".txt", ".bat", ".ps1", ".gitkeep", ".gitignore",
}


def escrever_utf8_lf(caminho: Path, conteudo: str) -> None:
    """Grava arquivo em UTF-8 sem BOM e fim de linha estritamente LF."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    texto_lf = conteudo.replace("\r\n", "\n").replace("\r", "\n")
    with open(caminho, "w", encoding="utf-8", newline="\n") as f:
        f.write(texto_lf)


def normalizar_arquivos_backend_lf() -> int:
    """Garante que todos os arquivos de texto fora de ui/ estejam em UTF-8 sem BOM e LF."""
    corrigidos = 0
    for raiz_atual, pastas, arquivos in os.walk(RAIZ):
        pastas[:] = [
            p for p in pastas
            if p not in {"ui", "__pycache__", ".git", "node_modules", ".venv", "99_LIXEIRA"}
        ]
        for nome in arquivos:
            caminho = Path(raiz_atual) / nome
            suf = caminho.suffix.lower()
            if suf not in EXTENSOES_TEXTO and caminho.name not in {".gitignore", ".gitkeep"}:
                continue
            bruto = caminho.read_bytes()
            mudou = False
            if bruto.startswith(b"\xef\xbb\xbf"):
                bruto = bruto[3:]
                mudou = True
            if b"\r\n" in bruto or b"\r" in bruto:
                bruto = bruto.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
                mudou = True
            if mudou:
                caminho.write_bytes(bruto)
                corrigidos += 1
    return corrigidos


def estimar_tokens(texto: str) -> int:
    """Estimativa enxuta de tokens (~1,35x número de palavras)."""
    palavras = len(texto.split())
    return max(1, int(round(palavras * 1.35)))


def parsear_frontmatter_simples(texto: str) -> Tuple[Dict[str, Any], str]:
    """Parser determinístico de frontmatter YAML enxuto usando apenas stdlib."""
    linhas = texto.replace("\r\n", "\n").split("\n")
    if not linhas or linhas[0].strip() != "---":
        return {}, texto

    meta: Dict[str, Any] = {}
    chave_lista_atual: Optional[str] = None
    idx_fim = -1

    for i in range(1, len(linhas)):
        linha = linhas[i]
        if linha.strip() == "---":
            idx_fim = i
            break
        if not linha.strip() or linha.strip().startswith("#"):
            continue

        if linha.startswith("  - ") and chave_lista_atual:
            item = linha.strip()[2:].strip().strip('"').strip("'")
            meta.setdefault(chave_lista_atual, []).append(item)
            continue

        if ":" in linha:
            chave, valor = linha.split(":", 1)
            chave = chave.strip()
            valor = valor.strip()
            if not valor:
                chave_lista_atual = chave
                meta[chave] = []
            elif valor.startswith("[") and valor.endswith("]"):
                chave_lista_atual = None
                try:
                    meta[chave] = json.loads(valor)
                except Exception:
                    itens = [x.strip().strip('"').strip("'") for x in valor[1:-1].split(",") if x.strip()]
                    meta[chave] = itens
            else:
                chave_lista_atual = None
                valor_limpo = valor.strip('"').strip("'")
                if valor_limpo.lower() == "true":
                    meta[chave] = True
                elif valor_limpo.lower() == "false":
                    meta[chave] = False
                elif valor_limpo.isdigit():
                    meta[chave] = int(valor_limpo)
                else:
                    meta[chave] = valor_limpo

    corpo = "\n".join(linhas[idx_fim + 1 :]).strip() if idx_fim != -1 else texto
    return meta, corpo


def traduzir_onde_amigavel(alvo: str, tipo: str = "doc") -> str:
    """
    Traduz uma coordenada técnica para rótulo amigável a usuários leigos.
    Exemplos:
      'motor.js:10-32' -> 'Código · Linhas 10 a 32'
      'Cap. 2, p. 19-34' -> 'Capítulo 2 · Págs. 19 a 34'
      '01:12-02:05' -> 'Vídeo · Minuto 01:12 a 02:05'
    """
    alvo_limpo = (alvo or "").strip()
    tipo_limpo = (tipo or "doc").strip().lower()

    # 1. Intervalo de tempo de vídeo (MM:SS-MM:SS)
    m_tempo_intervalo = re.search(r"(\d{1,2}:\d{2})\s*[-–a]\s*(\d{1,2}:\d{2})", alvo_limpo)
    if m_tempo_intervalo:
        return f"Vídeo · Minuto {m_tempo_intervalo.group(1)} a {m_tempo_intervalo.group(2)}"

    # 2. Minuto único de vídeo (ex.: "Minuto 02:30" ou "02:30" quando tipo=video)
    m_tempo_unico = re.search(r"(\d{1,2}:\d{2})", alvo_limpo)
    if m_tempo_unico and (tipo_limpo == "video" or "minuto" in alvo_limpo.lower()):
        return f"Vídeo · Minuto {m_tempo_unico.group(1)}"

    # 3. Capítulo + intervalo de páginas (ex.: "Cap. 2, p. 19-34")
    m_cap_pag = re.search(
        r"Cap(?:ítulo|itulo|\.)?\s*(\d+)\s*[,·\-]?\s*p(?:ágs?|ags?|\.)?\s*(\d+)\s*[-–a]\s*(\d+)",
        alvo_limpo,
        re.IGNORECASE,
    )
    if m_cap_pag:
        return f"Capítulo {m_cap_pag.group(1)} · Págs. {m_cap_pag.group(2)} a {m_cap_pag.group(3)}"

    # 4. Intervalo de Capítulos em guia/documento (ex.: "GUIA.md:Cap. 1-2")
    m_caps = re.search(r"Cap(?:ítulos|itulos|ítulo|itulo|\.)?\s*(\d+)\s*[-–a]\s*(\d+)", alvo_limpo, re.IGNORECASE)
    if m_caps:
        return f"Guia · Capítulos {m_caps.group(1)} a {m_caps.group(2)}"

    m_cap_unico = re.search(r"Cap(?:ítulo|itulo|\.)?\s*(\d+)", alvo_limpo, re.IGNORECASE)
    if m_cap_unico:
        return f"Livro · Capítulo {m_cap_unico.group(1)}"

    # 5. Intervalo ou página avulsa (ex.: "p. 19-34" ou "Pág. 12")
    m_pags = re.search(r"p(?:áginas?|aginas?|ágs?|ags?|\.)\s*(\d+)\s*[-–a]\s*(\d+)", alvo_limpo, re.IGNORECASE)
    if m_pags:
        return f"Livro · Págs. {m_pags.group(1)} a {m_pags.group(2)}"

    m_pag_unica = re.search(r"p(?:ágina|agina|ág|ag|\.)\s*(\d+)", alvo_limpo, re.IGNORECASE)
    if m_pag_unica:
        return f"Livro · Página {m_pag_unica.group(1)}"

    # 6. Pranchas visuais ou Seções de relatório
    m_pranchas = re.search(r"Pranchas?\s*(\d+)\s*[-–a]\s*(\d+)", alvo_limpo, re.IGNORECASE)
    if m_pranchas:
        return f"Galeria · Pranchas {m_pranchas.group(1)} a {m_pranchas.group(2)}"

    m_secoes = re.search(r"Se[çc][õo]es\s*(\d+)\s*[-–a]\s*(\d+)", alvo_limpo, re.IGNORECASE)
    if m_secoes:
        return f"Relatório · Seções {m_secoes.group(1)} a {m_secoes.group(2)}"

    # 7. Arquivo com intervalo de linhas (ex.: "motor.js:10-32")
    m_linhas = re.search(r"([^:\s/\\]+\.([a-z0-9]+)):(\d+)\s*[-–a]\s*(\d+)", alvo_limpo, re.IGNORECASE)
    if m_linhas:
        ext = m_linhas.group(2).lower()
        ini, fim = m_linhas.group(3), m_linhas.group(4)
        if tipo_limpo == "imagem" or ext in {"svg", "png", "jpg", "jpeg", "webp"}:
            return f"Ilustração · Linhas {ini} a {fim}"
        if tipo_limpo == "codigo" or ext in {"js", "ts", "py", "sh", "css", "jsonl", "html"}:
            return f"Código · Linhas {ini} a {fim}"
        return f"Documento · Linhas {ini} a {fim}"

    # 8. Apenas números de linha (ex.: "Linhas 10-32" ou ":10-32")
    m_so_linhas = re.search(r"(?:linhas?|:)\s*(\d+)\s*[-–a]\s*(\d+)", alvo_limpo, re.IGNORECASE)
    if m_so_linhas:
        prefixo = "Código" if tipo_limpo == "codigo" else "Documento"
        return f"{prefixo} · Linhas {m_so_linhas.group(1)} a {m_so_linhas.group(2)}"

    # Fallback amigável por tipo
    prefixos_tipo = {
        "codigo": "Código",
        "video": "Vídeo",
        "imagem": "Galeria",
        "pdf": "Livro",
        "doc": "Guia",
    }
    pref = prefixos_tipo.get(tipo_limpo, "Material")
    if not alvo_limpo:
        return f"{pref} · Seção Principal"
    return f"{pref} · {alvo_limpo}"


def extrair_resumo_e_coordenadas(corpo: str) -> Tuple[str, List[Dict[str, str]]]:
    """Extrai os bullets da Síntese Executiva e as linhas da tabela Sumário de Coordenadas."""
    linhas = corpo.split("\n")
    secao = ""
    bullets_resumo: List[str] = []
    coordenadas: List[Dict[str, str]] = []

    for linha in linhas:
        limpa = linha.strip()
        if limpa.startswith("## "):
            titulo_sec = limpa[3:].lower()
            if "síntese" in titulo_sec or "sintese" in titulo_sec or "resumo" in titulo_sec:
                secao = "resumo"
            elif "coordenadas" in titulo_sec or "ponto" in titulo_sec:
                secao = "coordenadas"
            else:
                secao = "outra"
            continue

        if secao == "resumo" and limpa.startswith("- "):
            texto_b = re.sub(r"\*\*([^*]+)\*\*", r"\1", limpa[2:].strip())
            bullets_resumo.append(texto_b)
        elif secao == "coordenadas" and limpa.startswith("|") and limpa.endswith("|"):
            partes = [p.strip() for p in limpa.strip("|").split("|")]
            if len(partes) >= 4:
                if partes[0].lower() in {"rótulo", "rotulo"} or set(partes[0]) <= {"-", ":"}:
                    continue
                rotulo = partes[0].replace("`", "").strip()
                alvo = partes[1].strip("` ")
                tipo = partes[2].strip("` ")
                resumo = partes[3].replace("`", "").strip()
                coordenadas.append(
                    {
                        "rotulo": rotulo,
                        "alvo": alvo,
                        "tipo": tipo,
                        "onde_amigavel": traduzir_onde_amigavel(alvo, tipo),
                        "resumo": resumo,
                    }
                )

    resumo_final = " ".join(bullets_resumo)
    return resumo_final, coordenadas


def classificar_tipo_arquivo(caminho: Path) -> str:
    nome_lower = caminho.name.lower()
    suf = caminho.suffix.lower()
    if "github" in nome_lower:
        return "link-github"
    if suf in {".js", ".ts", ".py", ".sh", ".css", ".jsonl"}:
        return "codigo"
    if suf == ".svg" or suf in {".png", ".jpg", ".jpeg", ".webp"}:
        return "imagem"
    if "livro" in nome_lower or "pdf" in nome_lower or suf == ".pdf":
        return "pdf"
    if "timestamp" in nome_lower or "video" in nome_lower or suf in {".mp4", ".webm"}:
        return "video"
    return "markdown"


def formatar_tamanho(num_bytes: int) -> str:
    if num_bytes < 1024:
        return f"{num_bytes} B"
    return f"{num_bytes / 1024.0:.1f} KB"


def ler_pacote_livro_aberto(livro_id: str, explicacao_leiga: str = "") -> Dict[str, Any]:
    pasta = DIR_LIVROS_ABERTOS / livro_id
    arquivos_info: List[Dict[str, str]] = []
    if pasta.exists():
        for arq in sorted(pasta.rglob("*"), key=lambda p: p.relative_to(pasta).as_posix()):
            if arq.is_file() and arq.name != ".gitkeep":
                rel_nome = arq.relative_to(pasta).as_posix()
                st = arq.stat()
                suf = arq.suffix.lower()
                if suf in {".png", ".jpg", ".jpeg", ".webp", ".mp4", ".webm", ".pdf"}:
                    preview = f"[Arquivo binário: {rel_nome} ({formatar_tamanho(st.st_size)})]"
                else:
                    conteudo = arq.read_text(encoding="utf-8", errors="replace").replace("\r\n", "\n")
                    preview = conteudo.strip()
                arquivos_info.append(
                    {
                        "nome": rel_nome,
                        "tipo": classificar_tipo_arquivo(arq),
                        "tamanho": formatar_tamanho(st.st_size),
                        "caminho": f"livros_abertos/{livro_id}/{rel_nome}",
                        "preview_conteudo": preview,
                    }
                )
    descricao_padrao = (
        explicacao_leiga
        if explicacao_leiga
        else f"Pacote completo do Livro Aberto {livro_id} com material detalhado e pontos de acesso direto."
    )
    return {
        "descricao_completa": descricao_padrao,
        "arquivos": arquivos_info,
    }


def formatar_nome_categoria_legivel(cat_id: str, nome_informado: str = "") -> str:
    """Retorna o nome legível de uma categoria a partir do nome informado ou do slug."""
    limpo = (nome_informado or "").strip()
    if limpo:
        return limpo
    for cat in DEFINICAO_CATEGORIAS:
        if cat["id"] == cat_id:
            return cat["nome"]
    partes = [p for p in re.split(r"[-_]+", cat_id.strip()) if p]
    if not partes:
        return "Estante Geral"
    conectivos = {"e", "de", "do", "da", "dos", "das", "em", "para", "com"}
    palavras = [p if p in conectivos else p.capitalize() for p in partes]
    if palavras:
        palavras[0] = palavras[0].capitalize()
    return " ".join(palavras)


def carregar_livros_das_capas() -> List[Dict[str, Any]]:
    livros: List[Dict[str, Any]] = []
    if not DIR_CAPAS.exists():
        return livros
    for arq_capa in sorted(DIR_CAPAS.glob("LIV-*.md")):
        texto = arq_capa.read_text(encoding="utf-8")
        meta, corpo = parsear_frontmatter_simples(texto)
        resumo_capa, coordenadas = extrair_resumo_e_coordenadas(corpo)
        livro_id = str(meta.get("id", arq_capa.stem.split("_")[0]))
        tipo_principal = str(meta.get("tipo_principal", "codigo-fonte"))
        subtitulo = str(meta.get("subtitulo", ""))
        explicacao_leiga = str(meta.get("explicacao_leiga", "")).strip() or (
            subtitulo if subtitulo else resumo_capa[:180]
        )
        tempo_leitura_capa = str(meta.get("tempo_leitura_capa", "1 min")).strip() or "1 min"

        pacote_aberto = ler_pacote_livro_aberto(livro_id, explicacao_leiga)
        qtd_arq = len(pacote_aberto.get("arquivos", []))
        tempo_completo_padrao = TEMPO_PADRAO_POR_TIPO.get(
            tipo_principal,
            f"Material com {qtd_arq} arquivo(s)" if qtd_arq else "Material completo",
        )
        tempo_material_completo = (
            str(meta.get("tempo_material_completo", "")).strip() or tempo_completo_padrao
        )

        tokens_capa = estimar_tokens(texto)
        tokens_aberto = int(meta.get("tokens_livro_aberto_est", 18000))

        cat_id = str(meta.get("categoria", "engenharia-e-codigo")).strip() or "engenharia-e-codigo"
        nome_cat = formatar_nome_categoria_legivel(cat_id, str(meta.get("nome_categoria", "")))

        favorito_raw = meta.get("favorito", False)
        favorito = (
            favorito_raw
            if isinstance(favorito_raw, bool)
            else str(favorito_raw).strip().lower() in {"true", "1", "sim", "yes"}
        )

        livros.append(
            {
                "id": livro_id,
                "titulo": str(meta.get("titulo", arq_capa.stem)),
                "subtitulo": subtitulo,
                "explicacao_leiga": explicacao_leiga,
                "tempo_leitura_capa": tempo_leitura_capa,
                "tempo_material_completo": tempo_material_completo,
                "categoria": cat_id,
                "nome_categoria": nome_cat,
                "tipo_principal": tipo_principal,
                "favorito": favorito,
                "tags": list(meta.get("tags", [])),
                "gatilhos": list(meta.get("gatilhos", [])),
                "cor_capa": str(meta.get("cor_capa", CORES_POR_TIPO.get(tipo_principal, "#10b981"))),
                "resumo_capa": resumo_capa,
                "tokens_capa": tokens_capa,
                "tokens_livro_aberto_est": tokens_aberto,
                "caminho_capa": f"capas/{arq_capa.name}",
                "caminho_livro_aberto": f"livros_abertos/{livro_id}/",
                "coordenadas": coordenadas,
                "livro_aberto": pacote_aberto,
            }
        )
    return livros


def gerar_subindices_categorias(livros: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    DIR_CATEGORIAS.mkdir(parents=True, exist_ok=True)
    categorias_saida: List[Dict[str, Any]] = []

    mapa_categorias: Dict[str, Dict[str, str]] = {}
    ordem_ids: List[str] = []

    for cat in DEFINICAO_CATEGORIAS:
        cid = cat["id"]
        mapa_categorias[cid] = {
            "id": cid,
            "nome": cat["nome"],
            "descricao": cat["descricao"],
        }
        ordem_ids.append(cid)

    # Descobre automaticamente qualquer categoria nova presente nas Capas
    for l in livros:
        cid = str(l.get("categoria", "")).strip()
        if not cid:
            continue
        if cid not in mapa_categorias:
            nome_legivel = formatar_nome_categoria_legivel(cid, str(l.get("nome_categoria", "")))
            mapa_categorias[cid] = {
                "id": cid,
                "nome": nome_legivel,
                "descricao": f"Estante personalizada para materiais de {nome_legivel}.",
            }
            ordem_ids.append(cid)
        elif l.get("nome_categoria") and cid not in {c["id"] for c in DEFINICAO_CATEGORIAS}:
            mapa_categorias[cid]["nome"] = str(l["nome_categoria"])

    # Move arquivos de categorias órfãs (de testes de estantes personalizadas) para 99_LIXEIRA
    ids_ativos = set(ordem_ids)
    for arq_existente in DIR_CATEGORIAS.glob("*.md"):
        if arq_existente.stem not in ids_ativos:
            mover_para_lixeira_teste(arq_existente)

    for cat_id in ordem_ids:
        cat = mapa_categorias[cat_id]
        livros_cat = [l for l in livros if l["categoria"] == cat_id]
        categorias_saida.append(
            {
                "id": cat_id,
                "nome": cat["nome"],
                "descricao": cat["descricao"],
                "total": len(livros_cat),
            }
        )

        linhas = [
            f"# Estante: {cat['nome']} (`{cat_id}`)",
            "",
            f"> {cat['descricao']}  ",
            f"> **Total de Livros nesta Categoria:** {len(livros_cat)} | **Índice Pai:** [[INDICE_MASTER]]",
            "",
            "---",
            "",
            "## Capas Disponíveis nesta Estante (Salto 2 -> Salto 3)",
            "",
            "| ID | Título da Capa | Formato | Leitura Rápida | Caminho da Capa |",
            "|---|---|---|---|---|",
        ]

        if not livros_cat:
            linhas.append("| — | *(Estante limpa — nenhum material catalogado ainda)* | — | — | — |")
        else:
            for l in livros_cat:
                econ = round((1.0 - (l["tokens_capa"] / max(1, l["tokens_livro_aberto_est"]))) * 100.0, 1)
                linhas.append(
                    f"| `{l['id']}` | **{l['titulo']}** | `{l['tipo_principal']}` | `{l['tempo_leitura_capa']}` vs. `{l['tempo_material_completo']}` (-{econ}% tokens) | `{l['caminho_capa']}` |"
                )

        linhas.append("")
        linhas.append("## Para que serve cada Material & Quando abrir")
        linhas.append("")
        if not livros_cat:
            linhas.append("*(Estante limpa — nenhum material catalogado ainda)*")
            linhas.append("")
        else:
            for l in livros_cat:
                linhas.append(f"### `{l['id']}` — {l['titulo']}")
                linhas.append(f"- **Para que serve:** {l['explicacao_leiga']}")
                linhas.append(f"- **Subtítulo:** {l['subtitulo']}")
                linhas.append(f"- **Capa Leve:** `{l['caminho_capa']}` | **Livro Aberto:** `{l['caminho_livro_aberto']}`")
                for g in l["gatilhos"]:
                    linhas.append(f"  - *Quando consultar:* {g}")
                linhas.append("")

        escrever_utf8_lf(DIR_CATEGORIAS / f"{cat_id}.md", "\n".join(linhas).strip() + "\n")

    return categorias_saida


def gerar_indice_master(categorias: List[Dict[str, Any]], livros: List[Dict[str, Any]]) -> int:
    linhas = [
        "# Índice Master — BetterVault (Biblioteca de 3 Estruturas)",
        "",
        "> **Porta de Entrada Única (3 Passos Simples):** Escolha a Estante (`categorias/<id>.md`), leia o resumo de 1 minuto na **Capa (`capas/LIV-NNN_*.md`)** e abra o **Livro Aberto (`livros_abertos/LIV-NNN/`)** direto na página ou minuto exato.",
        "",
        "## 1. Estantes por Categoria (Sub-Índices)",
        "",
        "| Categoria | Sub-Índice Markdown | Livros | O que você encontra nesta Estante |",
        "|---|---|---|---|",
    ]
    for c in categorias:
        linhas.append(f"| **{c['nome']}** | `categorias/{c['id']}.md` | `{c['total']}` | {c['descricao']} |")

    linhas.extend(
        [
            "",
            "## 2. Mapa Direto de Capas (Acesso Rápido por ID e Tipo)",
            "",
            "| ID | Título | Categoria | Tipo Principal | Capa (`Resumo 1 min`) | Livro Aberto (`Material Completo`) |",
            "|---|---|---|---|---|---|",
        ]
    )
    if not livros:
        linhas.append("| — | *(Estante limpa — nenhum material catalogado ainda)* | — | — | — | — |")
    else:
        for l in livros:
            linhas.append(
                f"| `{l['id']}` | {l['titulo']} | `{l['categoria']}` | `{l['tipo_principal']}` | `{l['caminho_capa']}` | `{l['caminho_livro_aberto']}` |"
            )

    linhas.extend(
        [
            "",
            "## 3. Comandos Rápidos do Bibliotecário (`< 5 ms`)",
            "- Iniciar Interface Visual + API Local: `python bibliotecario.py servir --porta 4325`",
            "- Buscar Capa + Ponto Exato: `python bibliotecario.py buscar \"<termo>\"`",
            "- Catalogar Novo Material: `python bibliotecario.py catalogar --titulo \"...\" --categoria engenharia-e-codigo --tipo codigo-fonte`",
            "- Sincronizar Índices e Catálogo: `python bibliotecario.py sincronizar`",
            "- Verificar Integridade Completa: `python bibliotecario.py testar`",
        ]
    )

    conteudo = "\n".join(linhas).strip() + "\n"
    escrever_utf8_lf(ARQ_MASTER, conteudo)
    return estimar_tokens(conteudo)


def comando_sincronizar(silencioso: bool = False) -> Dict[str, Any]:
    t0 = time.perf_counter()
    DIR_CAPAS.mkdir(parents=True, exist_ok=True)
    DIR_LIVROS_ABERTOS.mkdir(parents=True, exist_ok=True)
    DIR_CATEGORIAS.mkdir(parents=True, exist_ok=True)
    normalizar_arquivos_backend_lf()

    livros = carregar_livros_das_capas()
    categorias = gerar_subindices_categorias(livros)
    tokens_master = gerar_indice_master(categorias, livros)

    if len(livros) == 0:
        tokens_medios_capa = 0
        economia_pct = 0
    else:
        tokens_medios_capa = int(round(sum(l["tokens_capa"] for l in livros) / len(livros)))
        soma_capa = sum(l["tokens_capa"] for l in livros)
        soma_aberto = sum(l["tokens_livro_aberto_est"] for l in livros)
        economia_pct = int(round((1.0 - (soma_capa / max(1, soma_aberto))) * 100.0))

    catalogo: Dict[str, Any] = {
        "gerado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "metricas": {
            "total_categorias": len(categorias),
            "total_livros": len(livros),
            "tokens_indice_master": tokens_master,
            "tokens_medios_capa": tokens_medios_capa,
            "economia_media_pct": economia_pct,
        },
        "categorias": categorias,
        "livros": livros,
    }

    escrever_utf8_lf(ARQ_CATALOGO, json.dumps(catalogo, ensure_ascii=False, indent=2) + "\n")
    dt_ms = (time.perf_counter() - t0) * 1000.0
    if not silencioso:
        print(
            f"[OK] Sincronizacao concluida em {dt_ms:.2f} ms | "
            f"{len(categorias)} categorias | {len(livros)} livros | "
            f"Master: {tokens_master} tok | Media Capa: {tokens_medios_capa} tok | Economia: {economia_pct}%"
        )
    return catalogo


STOPWORDS_PT = {
    "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
    "para", "por", "com", "sem", "um", "uma", "o", "a", "os", "as",
    "e", "ou", "que", "como", "qual", "quais", "ao", "aos",
}


def tokenizar_ptbr(texto: str) -> List[str]:
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFD", texto.lower()) if unicodedata.category(c) != "Mn"
    )
    tokens = re.findall(r"[a-z0-9_.\-]+", sem_acento)
    return [t for t in tokens if len(t) >= 2 and t not in STOPWORDS_PT]


def radical_ptbr(token: str) -> str:
    return token[:6] if len(token) > 6 else token


def pontuar_texto(tokens_consulta: List[str], radicais_consulta: List[str], texto_alvo: str) -> float:
    if not texto_alvo:
        return 0.0
    tokens_alvo = tokenizar_ptbr(texto_alvo)
    if not tokens_alvo:
        return 0.0
    set_alvo = set(tokens_alvo)
    radicais_alvo = {radical_ptbr(t) for t in tokens_alvo}
    texto_norm = " ".join(tokens_alvo)

    pontos = 0.0
    for tk, rad in zip(tokens_consulta, radicais_consulta):
        if tk in set_alvo:
            pontos += 1.0
        elif rad in radicais_alvo or any(tk in a or a in tk for a in set_alvo if len(a) >= 3):
            pontos += 0.65
        elif tk in texto_norm:
            pontos += 0.5
    return pontos


def buscar_no_catalogo(termo: str, catalogo: Optional[Dict[str, Any]] = None) -> Tuple[List[Dict[str, Any]], float]:
    t0 = time.perf_counter()
    if catalogo is None:
        if not ARQ_CATALOGO.exists():
            catalogo = comando_sincronizar(silencioso=True)
        else:
            catalogo = json.loads(ARQ_CATALOGO.read_text(encoding="utf-8"))

    tokens_q = tokenizar_ptbr(termo)
    radicais_q = [radical_ptbr(t) for t in tokens_q]
    resultados: List[Dict[str, Any]] = []

    for livro in catalogo.get("livros", []):
        p_titulo = pontuar_texto(tokens_q, radicais_q, f"{livro['id']} {livro['titulo']} {livro['subtitulo']}") * 8.0
        p_gatilhos = pontuar_texto(
            tokens_q, radicais_q, " ".join(livro.get("tags", []) + livro.get("gatilhos", []))
        ) * 6.0
        p_resumo = pontuar_texto(
            tokens_q,
            radicais_q,
            f"{livro.get('explicacao_leiga', '')} {livro.get('resumo_capa', '')}",
        ) * 2.5

        melhor_coord = None
        maior_p_coord = -1.0
        soma_coord = 0.0
        for coord in livro.get("coordenadas", []):
            texto_c = f"{coord['rotulo']} {coord['alvo']} {coord.get('onde_amigavel', '')} {coord['tipo']} {coord['resumo']}"
            pc = pontuar_texto(tokens_q, radicais_q, texto_c) * 4.5
            soma_coord += pc
            if pc > maior_p_coord:
                maior_p_coord = pc
                melhor_coord = coord

        escore_total = round(p_titulo + p_gatilhos + p_resumo + soma_coord, 2)
        if escore_total > 0:
            resultados.append(
                {
                    "id": livro["id"],
                    "titulo": livro["titulo"],
                    "explicacao_leiga": livro.get("explicacao_leiga", ""),
                    "tempo_leitura_capa": livro.get("tempo_leitura_capa", "1 min"),
                    "tempo_material_completo": livro.get("tempo_material_completo", ""),
                    "categoria": livro["categoria"],
                    "tipo_principal": livro["tipo_principal"],
                    "escore": escore_total,
                    "caminho_capa": livro["caminho_capa"],
                    "caminho_livro_aberto": livro["caminho_livro_aberto"],
                    "tokens_capa": livro["tokens_capa"],
                    "tokens_livro_aberto_est": livro["tokens_livro_aberto_est"],
                    "coordenada_recomendada": melhor_coord
                    or (livro["coordenadas"][0] if livro.get("coordenadas") else None),
                }
            )

    resultados.sort(key=lambda r: r["escore"], reverse=True)
    dt_ms = (time.perf_counter() - t0) * 1000.0
    return resultados, dt_ms


def comando_buscar(termo: str) -> int:
    resultados, dt_ms = buscar_no_catalogo(termo)
    print(f"[BUSCA] Termo: \"{termo}\" | Tempo: {dt_ms:.2f} ms | Encontrados: {len(resultados)}")
    if not resultados:
        print("  Nenhuma Capa atingiu pontuacao para este termo.")
        return 0

    for idx, r in enumerate(resultados, start=1):
        coord = r["coordenada_recomendada"]
        onde_str = f"{coord['rotulo']} ({coord.get('onde_amigavel', coord['alvo'])})" if coord else "N/A"
        econ = round((1.0 - (r["tokens_capa"] / max(1, r["tokens_livro_aberto_est"]))) * 100.0, 1)
        print(
            f"  #{idx} [{r['id']}] {r['titulo']} (escore={r['escore']}) | "
            f"Ler Capa: {r['caminho_capa']} ({r.get('tempo_leitura_capa', '1 min')}, -{econ}%) | "
            f"Ir Direto ao Ponto: {onde_str}"
        )
    return 0


def calcular_proximo_id() -> str:
    """Calcula o próximo identificador sequencial LIV-NNN olhando capas/ e livros_abertos/."""
    maior = 0
    if DIR_CAPAS.exists():
        for arq in DIR_CAPAS.glob("LIV-*.md"):
            m = re.match(r"^LIV-(\d+)", arq.stem, re.IGNORECASE)
            if m:
                maior = max(maior, int(m.group(1)))
    if DIR_LIVROS_ABERTOS.exists():
        for pasta in DIR_LIVROS_ABERTOS.glob("LIV-*"):
            m = re.match(r"^LIV-(\d+)", pasta.name, re.IGNORECASE)
            if m:
                maior = max(maior, int(m.group(1)))
    return f"LIV-{maior + 1:03d}"


def normalizar_categoria_id(valor: str, nome_categoria: str = "") -> str:
    """Normaliza o slug da categoria, permitindo tanto as 3 estantes iniciais quanto novas estantes."""
    bruto = (valor or "").strip()
    if not bruto and nome_categoria:
        bruto = nome_categoria.strip()
    if not bruto:
        return "engenharia-e-codigo"

    sem_acento = "".join(
        c for c in unicodedata.normalize("NFD", bruto.lower()) if unicodedata.category(c) != "Mn"
    )
    slug = re.sub(r"[^a-z0-9]+", "-", sem_acento).strip("-")
    if not slug:
        return "engenharia-e-codigo"

    ids_padrao = {c["id"] for c in DEFINICAO_CATEGORIAS}
    if slug in ids_padrao:
        return slug

    # Mapeia sinônimos diretos apenas quando o usuário não pediu explicitamente uma nova categoria
    if not nome_categoria:
        if slug in {"engenharia", "codigo", "programacao", "dev"}:
            return "engenharia-e-codigo"
        if slug in {"midia", "video", "fotos", "motion", "design"}:
            return "midia-e-motion"
        if slug in {"referencias", "livros", "pdf", "estudos", "artigos"}:
            return "referencias-e-livros"

    return slug


def normalizar_tipo_principal(valor: str) -> str:
    v = (valor or "").strip().lower()
    if v in CORES_POR_TIPO:
        return v
    if "video" in v or "vídeo" in v or "aula" in v:
        return "video"
    if "foto" in v or "imagem" in v or "galeria" in v or "album" in v or "álbum" in v:
        return "fotos-ref"
    if "pdf" in v or "livro" in v:
        return "pdf-livro"
    if "github" in v or "repo" in v:
        return "github-repo"
    if "misto" in v or "guia" in v or "pacote" in v:
        return "pacote-misto"
    return "codigo-fonte"


def sanitizar_nome_arquivo(nome: str, tipo_principal: str) -> str:
    limpo = re.sub(r"[^a-zA-Z0-9_.\-]", "_", (nome or "").strip())
    limpo = limpo.strip("._")
    if not limpo:
        ext_padrao = ".py" if tipo_principal == "codigo-fonte" else ".md"
        return f"CONTEUDO_COMPLETO{ext_padrao}"
    if "." not in limpo:
        limpo += ".md"
    return limpo


def copiar_origem_para_livro_aberto(caminho_origem: str, dir_aberto: Path) -> List[Path]:
    """Copia um arquivo ou diretório real para dentro de livros_abertos/LIV-NNN/."""
    copiados: List[Path] = []
    if not caminho_origem or not str(caminho_origem).strip():
        return copiados

    p_orig = Path(str(caminho_origem).strip()).expanduser()
    if not p_orig.is_absolute():
        p_orig = (RAIZ / p_orig).resolve()

    if not p_orig.exists():
        raise FileNotFoundError(f"Arquivo ou pasta de origem nao encontrado: {caminho_origem}")

    dir_aberto.mkdir(parents=True, exist_ok=True)

    if p_orig.is_file():
        destino = dir_aberto / p_orig.name
        if p_orig.suffix.lower() in EXTENSOES_TEXTO:
            texto = p_orig.read_text(encoding="utf-8", errors="replace")
            escrever_utf8_lf(destino, texto)
        else:
            shutil.copy2(str(p_orig), str(destino))
        copiados.append(destino)
    elif p_orig.is_dir():
        for item in sorted(p_orig.rglob("*")):
            if item.is_file() and item.name not in {".gitkeep", ".DS_Store", "Thumbs.db"}:
                rel = item.relative_to(p_orig)
                destino = dir_aberto / rel
                destino.parent.mkdir(parents=True, exist_ok=True)
                if item.suffix.lower() in EXTENSOES_TEXTO:
                    texto = item.read_text(encoding="utf-8", errors="replace")
                    escrever_utf8_lf(destino, texto)
                else:
                    shutil.copy2(str(item), str(destino))
                copiados.append(destino)
    return copiados


def parsear_coordenada_cli(texto_coord: str, tipo_padrao: str = "doc") -> Optional[Dict[str, str]]:
    """Converte 'Rótulo|Alvo|Tipo|Resumo' em dicionário de coordenada."""
    partes = [p.strip() for p in (texto_coord or "").split("|")]
    partes = [p for p in partes if p != ""] if len(partes) == 1 and not partes[0] else partes
    if not partes:
        return None
    rotulo = partes[0] if len(partes) >= 1 and partes[0] else "Ponto Principal"
    alvo = partes[1] if len(partes) >= 2 and partes[1] else "Seção 1"
    tipo = partes[2] if len(partes) >= 3 and partes[2] else tipo_padrao
    resumo = partes[3] if len(partes) >= 4 and partes[3] else rotulo
    return {
        "rotulo": rotulo,
        "alvo": alvo,
        "tipo": tipo,
        "resumo": resumo,
    }


def guardar_novo_livro(dados: Dict[str, Any]) -> Dict[str, Any]:
    """
    Cria programaticamente um novo Livro Aberto + Capa Markdown formatada e sincroniza o acervo.
    Usado tanto pelo endpoint POST /api/guardar quanto pelo CLI e suíte de testes.
    """
    livro_id = str(dados.get("id", "") or "").strip().upper()
    if not re.match(r"^LIV-\d{3,}$", livro_id):
        livro_id = calcular_proximo_id()

    titulo = str(dados.get("titulo", "") or "").strip() or f"Material Catalogado {livro_id}"
    titulo_limpo = titulo.replace('"', "'")
    subtitulo = (
        str(dados.get("subtitulo", "") or "").strip()
        or "Guia prático e resumo rápido catalogado no BetterVault"
    ).replace('"', "'")

    nome_categoria_raw = str(dados.get("nome_categoria", "") or "").strip()
    categoria = normalizar_categoria_id(
        str(dados.get("categoria", "") or "engenharia-e-codigo"),
        nome_categoria=nome_categoria_raw,
    )
    nome_categoria = formatar_nome_categoria_legivel(categoria, nome_categoria_raw)

    tipo_principal = normalizar_tipo_principal(
        str(dados.get("tipo_principal") or dados.get("tipo") or "codigo-fonte")
    )
    cor_capa = str(dados.get("cor_capa", "") or "").strip() or CORES_POR_TIPO.get(tipo_principal, "#10b981")

    resumo_bruto = dados.get("resumo_capa") or dados.get("resumo") or ""
    if isinstance(resumo_bruto, list):
        linhas_resumo = [str(x).strip().lstrip("-• ").strip() for x in resumo_bruto if str(x).strip()]
    else:
        linhas_resumo = [
            ln.strip().lstrip("-• ").strip()
            for ln in str(resumo_bruto).replace("\r\n", "\n").split("\n")
            if ln.strip()
        ]
    if not linhas_resumo:
        linhas_resumo = [f"Síntese principal de {titulo} pronta para consulta rápida."]

    explicacao_leiga = (
        str(dados.get("explicacao_leiga") or dados.get("para_que_serve") or "").strip()
        or linhas_resumo[0]
    ).replace('"', "'")

    tempo_leitura_capa = (
        str(dados.get("tempo_leitura_capa") or dados.get("tempo_capa") or "1 min").strip() or "1 min"
    )
    tempo_material_completo = (
        str(dados.get("tempo_material_completo") or dados.get("tempo_completo") or "").strip()
        or TEMPO_PADRAO_POR_TIPO.get(tipo_principal, "Material completo (1 arquivo)")
    )

    tags_brutas = dados.get("tags", [])
    if isinstance(tags_brutas, str):
        tags = [t.strip() for t in re.split(r"[,;]", tags_brutas) if t.strip()]
    elif isinstance(tags_brutas, list):
        tags = [str(t).strip() for t in tags_brutas if str(t).strip()]
    else:
        tags = []
    if not tags:
        tags = [tipo_principal, categoria] + tokenizar_ptbr(titulo)[:3]

    gatilhos_brutos = dados.get("gatilhos") or dados.get("gatilho") or []
    if isinstance(gatilhos_brutos, str):
        gatilhos = [g.strip() for g in re.split(r"[\n;,]", gatilhos_brutos) if g.strip()]
    elif isinstance(gatilhos_brutos, list):
        gatilhos = [str(g).strip() for g in gatilhos_brutos if str(g).strip()]
    else:
        gatilhos = []
    if not gatilhos:
        gatilhos = [f"consultar {titulo.lower()}", explicacao_leiga[:90]]

    dir_aberto = DIR_LIVROS_ABERTOS / livro_id
    dir_aberto.mkdir(parents=True, exist_ok=True)

    # Copia arquivos reais de origem caso informados (--arquivo-origem ou arquivos_origem)
    origens_brutas = dados.get("arquivos_origem") or dados.get("arquivo_origem") or []
    if isinstance(origens_brutas, str):
        origens_lista = [origens_brutas] if origens_brutas.strip() else []
    elif isinstance(origens_brutas, list):
        origens_lista = [str(x).strip() for x in origens_brutas if str(x).strip()]
    else:
        origens_lista = []

    arquivos_copiados: List[Path] = []
    for orig in origens_lista:
        arquivos_copiados.extend(copiar_origem_para_livro_aberto(orig, dir_aberto))

    nome_arq_informado = str(dados.get("nome_arquivo", "") or "").strip()
    conteudo_arq_informado = str(dados.get("conteudo_arquivo", "") or "").strip()

    if nome_arq_informado or conteudo_arq_informado or not arquivos_copiados:
        nome_arquivo = sanitizar_nome_arquivo(nome_arq_informado, tipo_principal)
        conteudo_arquivo = conteudo_arq_informado
        if not conteudo_arquivo:
            conteudo_arquivo = (
                f"# {titulo} ({livro_id})\n\n"
                f"> **Para que serve:** {explicacao_leiga}\n\n"
                f"## Conteúdo Completo\n\n"
                + "\n".join(f"- {b}" for b in linhas_resumo)
                + "\n"
            )
        arq_destino = dir_aberto / nome_arquivo
        escrever_utf8_lf(arq_destino, conteudo_arquivo + "\n")
        arquivos_copiados.append(arq_destino)
    else:
        nome_arquivo = arquivos_copiados[0].relative_to(dir_aberto).as_posix()
        try:
            conteudo_arquivo = arquivos_copiados[0].read_text(encoding="utf-8", errors="replace")
        except Exception:
            conteudo_arquivo = ""

    tipo_coord_padrao = {
        "video": "video",
        "pdf-livro": "pdf",
        "fotos-ref": "imagem",
        "codigo-fonte": "codigo",
        "github-repo": "codigo",
        "pacote-misto": "doc",
    }.get(tipo_principal, "doc")

    coords_entrada = dados.get("coordenadas", [])
    coordenadas_formatadas: List[Dict[str, str]] = []
    if isinstance(coords_entrada, list):
        for c in coords_entrada:
            if isinstance(c, str):
                parsed = parsear_coordenada_cli(c, tipo_coord_padrao)
                if parsed:
                    coordenadas_formatadas.append(parsed)
                continue
            if not isinstance(c, dict):
                continue
            rotulo = str(c.get("rotulo") or c.get("nome") or c.get("titulo") or "").strip().replace("|", "-")
            alvo = str(c.get("alvo") or c.get("onde") or c.get("local") or "").strip().replace("|", "-")
            tipo_c = str(c.get("tipo") or tipo_coord_padrao).strip().replace("|", "-")
            resumo_c = (
                str(c.get("resumo") or c.get("ensina") or c.get("descricao") or "").strip().replace("|", "-")
            )
            if rotulo or alvo or resumo_c:
                coordenadas_formatadas.append(
                    {
                        "rotulo": rotulo or "Ponto Principal",
                        "alvo": alvo or f"{nome_arquivo}:1-20",
                        "tipo": tipo_c or tipo_coord_padrao,
                        "resumo": resumo_c or explicacao_leiga,
                    }
                )

    if not coordenadas_formatadas:
        total_linhas = max(1, len(conteudo_arquivo.splitlines())) if conteudo_arquivo else 20
        coordenadas_formatadas.append(
            {
                "rotulo": "Conteúdo Principal",
                "alvo": f"{nome_arquivo}:1-{total_linhas}",
                "tipo": tipo_coord_padrao,
                "resumo": explicacao_leiga,
            }
        )

    slug = "-".join(tokenizar_ptbr(titulo)[:5]) or "material-catalogado"
    arq_capa = DIR_CAPAS / f"{livro_id}_{slug}.md"

    tags_json = json.dumps(tags, ensure_ascii=False)
    bloco_gatilhos = "\n".join(f'  - "{g.replace(chr(34), chr(39))}"' for g in gatilhos)
    bloco_resumo = "\n".join(f"- {b}" for b in linhas_resumo)
    bloco_coords = "\n".join(
        f"| {c['rotulo']} | `{c['alvo']}` | `{c['tipo']}` | {c['resumo']} |"
        for c in coordenadas_formatadas
    )

    linha_nome_cat = f'\nnome_categoria: "{nome_categoria.replace(chr(34), chr(39))}"' if nome_categoria_raw else ""
    favorito_flag = "true" if bool(dados.get("favorito", False)) else "false"

    conteudo_capa = f"""---
id: {livro_id}
titulo: "{titulo_limpo}"
subtitulo: "{subtitulo}"
explicacao_leiga: "{explicacao_leiga}"
tempo_leitura_capa: "{tempo_leitura_capa}"
tempo_material_completo: "{tempo_material_completo}"
categoria: {categoria}{linha_nome_cat}
tipo_principal: {tipo_principal}
favorito: {favorito_flag}
cor_capa: "{cor_capa}"
tags: {tags_json}
gatilhos:
{bloco_gatilhos}
tokens_livro_aberto_est: 12000
---

# Capa {livro_id} — {titulo_limpo}

## Síntese Executiva (Conhecimento Rápido na Capa)
{bloco_resumo}

## Sumário de Coordenadas (Onde Abrir no Livro Aberto)
| Rótulo | Alvo Exato | Tipo | Resumo da Coordenada |
|---|---|---|---|
{bloco_coords}
"""
    escrever_utf8_lf(arq_capa, conteudo_capa)
    catalogo = comando_sincronizar(silencioso=True)
    livro_criado = next((l for l in catalogo.get("livros", []) if l["id"] == livro_id), None)

    return {
        "ok": True,
        "id": livro_id,
        "caminho_capa": f"capas/{arq_capa.name}",
        "livro": livro_criado,
        "catalogo": catalogo,
    }


def alternar_favorito_livro(livro_id: str, favorito: Optional[bool] = None) -> Dict[str, Any]:
    """Atualiza o campo favorito: true/false no frontmatter da Capa e sincroniza o catálogo."""
    lid = str(livro_id or "").strip().upper()
    if not lid:
        raise ValueError("ID do livro nao informado.")

    arq_alvo = None
    if DIR_CAPAS.exists():
        for arq in sorted(DIR_CAPAS.glob(f"{lid}_*.md")):
            arq_alvo = arq
            break
        if arq_alvo is None:
            for arq in sorted(DIR_CAPAS.glob(f"{lid}.md")):
                arq_alvo = arq
                break

    if arq_alvo is None or not arq_alvo.exists():
        raise FileNotFoundError(f"Capa nao encontrada para {lid}")

    texto = arq_alvo.read_text(encoding="utf-8").replace("\r\n", "\n")
    meta, _ = parsear_frontmatter_simples(texto)
    atual = bool(meta.get("favorito", False))
    novo_valor = (not atual) if favorito is None else bool(favorito)
    valor_str = "true" if novo_valor else "false"

    linhas = texto.split("\n")
    if linhas and linhas[0].strip() == "---":
        idx_fim = -1
        idx_fav = -1
        for i in range(1, len(linhas)):
            if linhas[i].strip() == "---":
                idx_fim = i
                break
            if linhas[i].strip().startswith("favorito:"):
                idx_fav = i
        if idx_fav != -1:
            linhas[idx_fav] = f"favorito: {valor_str}"
        elif idx_fim != -1:
            linhas.insert(idx_fim, f"favorito: {valor_str}")
        escrever_utf8_lf(arq_alvo, "\n".join(linhas))

    catalogo = comando_sincronizar(silencioso=True)
    return {"ok": True, "id": lid, "favorito": novo_valor, "catalogo": catalogo}


def comando_catalogar(args: argparse.Namespace) -> int:
    gatilhos_combinados: List[str] = []
    if getattr(args, "gatilhos", ""):
        gatilhos_combinados.extend(
            [g.strip() for g in re.split(r"[\n;,]", args.gatilhos) if g.strip()]
        )
    if getattr(args, "gatilho", "") and args.gatilho != "consulta rápida direta":
        gatilhos_combinados.append(args.gatilho.strip())

    resultado = guardar_novo_livro(
        {
            "id": args.id,
            "titulo": args.titulo,
            "subtitulo": args.subtitulo,
            "explicacao_leiga": args.explicacao_leiga or args.resumo,
            "categoria": args.categoria,
            "nome_categoria": getattr(args, "nome_categoria", ""),
            "tipo_principal": args.tipo,
            "tempo_leitura_capa": getattr(args, "tempo_capa", "1 min"),
            "tempo_material_completo": getattr(args, "tempo_completo", ""),
            "cor_capa": args.cor,
            "tags": getattr(args, "tags", ""),
            "gatilhos": gatilhos_combinados,
            "resumo_capa": args.resumo,
            "coordenadas": getattr(args, "coordenadas", None) or [],
            "arquivos_origem": getattr(args, "arquivos_origem", None) or [],
            "nome_arquivo": getattr(args, "nome_arquivo", ""),
            "conteudo_arquivo": getattr(args, "conteudo_arquivo", ""),
        }
    )
    print(f"[OK] Livro {resultado['id']} catalogado em {resultado['caminho_capa']} e sincronizado.")
    return 0


class ManipuladorBibliotecaHTTP(SimpleHTTPRequestHandler):
    """Servidor HTTP local estático + API JSON para o BetterVault."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(RAIZ), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def guess_type(self, path: str) -> str:
        base, ext = os.path.splitext(path)
        ext = ext.lower()
        mapa_utf8 = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".jsonl": "application/json; charset=utf-8",
            ".md": "text/markdown; charset=utf-8",
            ".py": "text/plain; charset=utf-8",
            ".ts": "text/plain; charset=utf-8",
            ".sh": "text/plain; charset=utf-8",
            ".svg": "image/svg+xml; charset=utf-8",
        }
        if ext in mapa_utf8:
            return mapa_utf8[ext]
        tipo, _ = mimetypes.guess_type(path)
        return tipo or "application/octet-stream"

    def _enviar_json(self, status: int, payload: Dict[str, Any]) -> None:
        corpo = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        rota = urlparse(self.path).path
        if rota in {"/", "/index.html"}:
            self.send_response(302)
            self.send_header("Location", "/ui/index.html")
            self.end_headers()
            return

        if rota == "/api/catalogo":
            if not ARQ_CATALOGO.exists():
                catalogo = comando_sincronizar(silencioso=True)
            else:
                catalogo = json.loads(ARQ_CATALOGO.read_text(encoding="utf-8"))
            self._enviar_json(200, catalogo)
            return

        # Previne escape fora de RAIZ
        caminho_rel = unquote(rota.lstrip("/"))
        alvo = (RAIZ / caminho_rel).resolve()
        if not str(alvo).startswith(str(RAIZ)):
            self._enviar_json(403, {"ok": False, "erro": "Acesso fora da raiz nao permitido."})
            return

        super().do_GET()

    def do_POST(self) -> None:
        rota = urlparse(self.path).path
        tamanho = int(self.headers.get("Content-Length", "0") or "0")
        bruto = self.rfile.read(tamanho) if tamanho > 0 else b"{}"

        if rota == "/api/sincronizar":
            catalogo = comando_sincronizar(silencioso=True)
            self._enviar_json(200, {"ok": True, "catalogo": catalogo})
            return

        if rota == "/api/guardar":
            try:
                dados = json.loads(bruto.decode("utf-8")) if bruto else {}
                if not isinstance(dados, dict):
                    raise ValueError("Payload JSON deve ser um objeto.")
                res = guardar_novo_livro(dados)
                self._enviar_json(200, res)
            except Exception as exc:
                self._enviar_json(400, {"ok": False, "erro": str(exc)})
            return

        if rota == "/api/favoritar":
            try:
                dados = json.loads(bruto.decode("utf-8")) if bruto else {}
                if not isinstance(dados, dict):
                    raise ValueError("Payload JSON deve ser um objeto.")
                fav_arg = dados.get("favorito", None)
                fav_bool = None if fav_arg is None else bool(fav_arg)
                res = alternar_favorito_livro(str(dados.get("id", "")), fav_bool)
                self._enviar_json(200, res)
            except Exception as exc:
                self._enviar_json(400, {"ok": False, "erro": str(exc)})
            return

        self._enviar_json(404, {"ok": False, "erro": f"Rota desconhecida: {rota}"})


def comando_servir(porta: int = 4325) -> int:
    comando_sincronizar(silencioso=True)
    endereco = ("127.0.0.1", porta)
    servidor = HTTPServer(endereco, ManipuladorBibliotecaHTTP)
    print(f"[SERVIDOR] BetterVault ativo em http://127.0.0.1:{porta}/ui/index.html")
    print("  Rotas de API prontas: GET /api/catalogo | POST /api/sincronizar | POST /api/guardar")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\n[SERVIDOR] Encerrado pelo usuario.")
    finally:
        servidor.server_close()
    return 0


def mover_para_lixeira_teste(caminho: Path) -> None:
    """Move artefato temporário de teste para 99_LIXEIRA/<data>/testes_bibliotecario sem apagar nada."""
    if not caminho.exists():
        return
    data_str = datetime.now().strftime("%Y-%m-%d")
    pasta_lixeira = RAIZ / "99_LIXEIRA" / data_str / "testes_bibliotecario"
    pasta_lixeira.mkdir(parents=True, exist_ok=True)
    destino = pasta_lixeira / f"{int(time.time() * 1000)}_{caminho.name}"
    shutil.move(str(caminho), str(destino))


def comando_testar() -> int:
    t0 = time.perf_counter()
    erros: List[str] = []

    catalogo_inicial = comando_sincronizar(silencioso=True)
    qtd_livros_inicial = len(catalogo_inicial.get("livros", []))

    # 1. Verificar existência e tamanho enxuto do INDICE_MASTER.md
    if not ARQ_MASTER.exists():
        erros.append("INDICE_MASTER.md nao existe")
    else:
        linhas_master = ARQ_MASTER.read_text(encoding="utf-8").splitlines()
        if len(linhas_master) > 80:
            erros.append(f"INDICE_MASTER.md excedeu 80 linhas ({len(linhas_master)})")

    # 2. Verificar schema exato do catalogo.json (funciona com 0 livros ou N livros)
    chaves_raiz = {"gerado_em", "metricas", "categorias", "livros"}
    if not chaves_raiz.issubset(catalogo_inicial.keys()):
        erros.append(f"Chaves ausentes em catalogo.json: {chaves_raiz - set(catalogo_inicial.keys())}")

    metricas = catalogo_inicial.get("metricas", {})
    if metricas.get("total_categorias", 0) < 3:
        erros.append(f"Total de categorias invalido (< 3): {metricas}")
    if metricas.get("total_livros") != qtd_livros_inicial:
        erros.append(f"Inconsistencia em total_livros: {metricas}")
    if qtd_livros_inicial == 0:
        if metricas.get("tokens_medios_capa") != 0 or metricas.get("economia_media_pct") != 0:
            erros.append(f"Metricas em instalacao limpa devem ser 0: {metricas}")

    # 3. Verificar integridade das categorias e livros atuais
    for cat in catalogo_inicial.get("categorias", []):
        arq_cat = DIR_CATEGORIAS / f"{cat['id']}.md"
        if not arq_cat.exists():
            erros.append(f"Sub-indice ausente: {arq_cat}")

    for livro in catalogo_inicial.get("livros", []):
        lid = livro["id"]
        caminho_capa = RAIZ / livro["caminho_capa"]
        caminho_aberto = RAIZ / livro["caminho_livro_aberto"]
        if not caminho_capa.exists():
            erros.append(f"Capa ausente para {lid}: {caminho_capa}")
        if not caminho_aberto.exists():
            erros.append(f"Pasta Livro Aberto ausente para {lid}: {caminho_aberto}")
        if not livro.get("explicacao_leiga"):
            erros.append(f"Livro {lid} sem explicacao_leiga")
        if not livro.get("coordenadas"):
            erros.append(f"Livro {lid} sem Sumario de Coordenadas na Capa")

    # 4. Validar tradutor automático de coordenadas (onde_amigavel) nos 3 formatos principais
    exemplos_traducao = [
        ("motor.js:10-32", "codigo", "Código · Linhas 10 a 32"),
        ("Cap. 2, p. 19-34", "pdf", "Capítulo 2 · Págs. 19 a 34"),
        ("01:12-02:05", "video", "Vídeo · Minuto 01:12 a 02:05"),
    ]
    for alvo_ex, tipo_ex, esp_ex in exemplos_traducao:
        obt_ex = traduzir_onde_amigavel(alvo_ex, tipo_ex)
        if obt_ex != esp_ex:
            erros.append(f"traduzir_onde_amigavel('{alvo_ex}') esperava '{esp_ex}', obteve '{obt_ex}'")

    # 5. Teste Fim-a-Fim: criar livro temporário (com categoria personalizada + arquivo-origem), buscar em < 10 ms no #1, validar campos e restaurar estado
    dt_busca_ms = 0.0
    try:
        res_guardar = guardar_novo_livro(
            {
                "titulo": "Guia Rápido de Teste de Catalogação Visual",
                "subtitulo": "Teste automatizado fim-a-fim do BetterVault",
                "categoria": "financas-e-negocios",
                "nome_categoria": "Finanças & Negócios",
                "tipo_principal": "pdf-livro",
                "tempo_leitura_capa": "1 min",
                "tempo_material_completo": "32 páginas",
                "explicacao_leiga": "Um guia simples criado automaticamente para validar o fluxo de catalogação e busca.",
                "resumo_capa": "Valida a gravação da Capa Markdown, Livro Aberto, estante dinâmica e busca instantânea.",
                "tags": ["teste-e2e", "guia-bettervault"],
                "gatilhos": ["como guardar novo livro pela interface ou cli"],
                "coordenadas": [
                    "Introdução Rápida|Cap. 1, p. 1-5|pdf|Passo a passo inicial do teste",
                    "Código Exemplo|exemplo.py:10-25|codigo|Função principal demonstrativa",
                ],
                "arquivos_origem": ["README.md"],
                "nome_arquivo": "GUIA_TESTE.md",
                "conteudo_arquivo": "# Guia de Teste\n\nConteúdo completo validado com sucesso.",
            }
        )
        id_criado = res_guardar.get("id", "")
        livro_criado = res_guardar.get("livro")
        catalogo_pos_criacao = res_guardar.get("catalogo", {})

        if not res_guardar.get("ok") or not id_criado.startswith("LIV-") or not livro_criado:
            erros.append(f"Falha ao criar livro programaticamente: {res_guardar}")
        else:
            onde_criado_0 = livro_criado["coordenadas"][0].get("onde_amigavel", "")
            onde_criado_1 = livro_criado["coordenadas"][1].get("onde_amigavel", "")
            if onde_criado_0 != "Capítulo 1 · Págs. 1 a 5":
                erros.append(f"onde_amigavel[0] incorreto no livro criado: {onde_criado_0}")
            if onde_criado_1 != "Código · Linhas 10 a 25":
                erros.append(f"onde_amigavel[1] incorreto no livro criado: {onde_criado_1}")
            if not livro_criado.get("explicacao_leiga"):
                erros.append("Livro criado sem explicacao_leiga")
            if len(livro_criado.get("livro_aberto", {}).get("arquivos", [])) < 2:
                erros.append("Livro criado deveria conter GUIA_TESTE.md e copia de README.md via arquivos_origem")
            ids_cat_pos = {c["id"] for c in catalogo_pos_criacao.get("categorias", [])}
            if "financas-e-negocios" not in ids_cat_pos:
                erros.append(f"Estante dinamica 'financas-e-negocios' nao foi descoberta: {ids_cat_pos}")

            # Testar alternar_favorito_livro
            res_fav = alternar_favorito_livro(id_criado, True)
            if not res_fav.get("ok") or res_fav.get("favorito") is not True:
                erros.append(f"alternar_favorito_livro falhou ao marcar favorito: {res_fav}")

            # Busca pelo livro recém-criado
            res_busca, dt_busca_ms = buscar_no_catalogo("teste-e2e catalogacao visual", catalogo_pos_criacao)
            if not res_busca or res_busca[0]["id"] != id_criado:
                obt = res_busca[0]["id"] if res_busca else "NENHUM"
                erros.append(f"Busca pelo livro temporario esperava {id_criado} em #1, obteve {obt}")
            if dt_busca_ms >= 10.0:
                erros.append(f"Busca excedeu 10 ms: {dt_busca_ms:.2f} ms")

        # Mover artefatos temporários de teste para 99_LIXEIRA/<data>/testes_bibliotecario e ressincronizar
        if id_criado:
            mover_para_lixeira_teste(RAIZ / res_guardar["caminho_capa"])
            mover_para_lixeira_teste(DIR_LIVROS_ABERTOS / id_criado)
            catalogo_restaurado = comando_sincronizar(silencioso=True)
            if len(catalogo_restaurado.get("livros", [])) != qtd_livros_inicial:
                erros.append(
                    f"Estado nao restaurado apos teste: esperava {qtd_livros_inicial} livros, "
                    f"obteve {len(catalogo_restaurado.get('livros', []))}"
                )
    except Exception as exc:
        erros.append(f"Excecao ao testar guardar_novo_livro: {exc}")

    # 6. Auditar UTF-8 sem BOM e LF em todos os arquivos do projeto (incluindo ui/)
    for raiz_atual, pastas, arquivos in os.walk(RAIZ):
        pastas[:] = [
            p for p in pastas
            if p not in {"__pycache__", ".git", "node_modules", ".venv", "99_LIXEIRA"}
        ]
        for nome in arquivos:
            p = Path(raiz_atual) / nome
            suf = p.suffix.lower()
            if suf not in EXTENSOES_TEXTO and p.name not in {".gitignore", ".gitkeep"}:
                continue
            b = p.read_bytes()
            if b.startswith(b"\xef\xbb\xbf"):
                erros.append(f"BOM detectado em {p.relative_to(RAIZ)}")
            if b"\r\n" in b:
                erros.append(f"CRLF detectado em {p.relative_to(RAIZ)}")

    dt_total_ms = (time.perf_counter() - t0) * 1000.0

    if erros:
        print(f"[FALHA] {len(erros)} erro(s) encontrados:")
        for e in erros:
            print(f"  - {e}")
        return 1

    print(
        f"[PASSOU] Autoteste completo 100% verde em {dt_total_ms:.2f} ms | "
        f"Estado preservado ({qtd_livros_inicial} livros) | "
        f"Busca E2E: {dt_busca_ms:.2f} ms (< 10 ms) | "
        f"Campos amigaveis + API /api/guardar + UTF-8/LF verificados."
    )
    return 0


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(
        description="Motor O Bibliotecário — BetterVault (Biblioteca de 3 Estruturas)"
    )
    sub = parser.add_subparsers(dest="comando")

    sub.add_parser("sincronizar", help="Regenera categorias/*.md, INDICE_MASTER.md e catalogo.json")

    p_buscar = sub.add_parser("buscar", help="Busca Capas e Coordenadas em < 10 ms")
    p_buscar.add_argument("termo", help="Termo ou pergunta para O Bibliotecário")

    p_cat = sub.add_parser("catalogar", help="Cataloga um novo livro em 1 comando (humanos e agentes)")
    p_cat.add_argument("--id", default="", help="ID opcional (ex.: LIV-001). Se omitido, calcula automaticamente.")
    p_cat.add_argument("--titulo", required=True, help="Título claro do material")
    p_cat.add_argument("--subtitulo", default="Resumo prático catalogado no BetterVault", help="Subtítulo curto")
    p_cat.add_argument("--explicacao-leiga", dest="explicacao_leiga", default="", help="Explicação simples em 1 frase")
    p_cat.add_argument("--categoria", default="engenharia-e-codigo", help="Slug da estante/categoria")
    p_cat.add_argument("--nome-categoria", dest="nome_categoria", default="", help="Nome legível se for nova estante")
    p_cat.add_argument(
        "--tipo",
        default="codigo-fonte",
        help="Tipo: codigo-fonte | github-repo | video | fotos-ref | pdf-livro | pacote-misto",
    )
    p_cat.add_argument("--tempo-capa", dest="tempo_capa", default="1 min", help="Tempo de leitura da capa (ex.: 1 min)")
    p_cat.add_argument("--tempo-completo", dest="tempo_completo", default="", help="Tamanho/duração do material completo")
    p_cat.add_argument("--cor", default="", help="Cor hexadecimal opcional da capa (ex.: #10b981)")
    p_cat.add_argument("--tags", default="", help="Tags separadas por vírgula")
    p_cat.add_argument("--gatilhos", default="", help="Frases de quando consultar separadas por ponto-e-vírgula")
    p_cat.add_argument("--gatilho", default="consulta rápida direta", help="Alias simples para um único gatilho")
    p_cat.add_argument("--resumo", default="Conhecimento destilado na capa.", help="Bullets de resumo (separados por quebra de linha)")
    p_cat.add_argument(
        "--coordenada",
        dest="coordenadas",
        action="append",
        default=[],
        help="Coordenada no formato 'Rótulo|Alvo|Tipo|Resumo' (pode repetir várias vezes)",
    )
    p_cat.add_argument(
        "--arquivo-origem",
        dest="arquivos_origem",
        action="append",
        default=[],
        help="Caminho de arquivo ou pasta real para copiar para livros_abertos/LIV-NNN/ (pode repetir)",
    )
    p_cat.add_argument("--nome-arquivo", dest="nome_arquivo", default="", help="Nome do arquivo gerado no Livro Aberto")
    p_cat.add_argument("--conteudo-arquivo", dest="conteudo_arquivo", default="", help="Conteúdo textual do arquivo no Livro Aberto")

    p_servir = sub.add_parser("servir", help="Inicia servidor HTTP local + API visual (/api/catalogo, /api/guardar)")
    p_servir.add_argument("--porta", type=int, default=4325, help="Porta HTTP local (padrao: 4325)")

    sub.add_parser("testar", help="Executa a suíte de autoteste de integridade, campos amigáveis e performance")

    args = parser.parse_args()
    if args.comando == "sincronizar":
        comando_sincronizar()
        return 0
    if args.comando == "buscar":
        return comando_buscar(args.termo)
    if args.comando == "catalogar":
        return comando_catalogar(args)
    if args.comando == "servir":
        return comando_servir(args.porta)
    if args.comando == "testar":
        return comando_testar()

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
