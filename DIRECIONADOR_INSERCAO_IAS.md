# Direcionador Universal de Inserção de Conhecimento (Para Qualquer IA)

> **Copie este bloco ou envie este arquivo para qualquer IA (ChatGPT, Claude, Gemini, Cursor, Windsurf, Ollama/LM Studio)** sempre que quiser que ela transforme um estudo, código, vídeo, PDF ou conversa em conhecimento estruturado dentro do **BetterVault**.

---

## Prompt Pronto (Copie e Cole na Outra IA)

```text
Você vai preparar e/ou inserir um novo conhecimento no BetterVault (central oficial em D:\00 - Better Vault (Library)).
NUNCA use o antigo vault Singularity. Responda em português do Brasil.

### 1. Classificação Obrigatória (Escolha EXATAMENTE 1 das 3 categorias)
- `engenharia-e-codigo` | tipo: `codigo-fonte` ou `github-repo` | alvo padrão das coordenadas: `arquivo.ext:inicio-fim` (ex.: `motor.py:12-48`)
- `midia-e-motion` | tipo: `video` ou `fotos-ref` | alvo padrão das coordenadas: `MM:SS-MM:SS` ou `Pranchas 1-3`
- `referencias-e-livros` | tipo: `pdf-livro` ou `pacote-misto` | alvo padrão das coordenadas: `Cap. X, p. Y-Z`

### 2. Modelo de 2 Camadas (Obrigatório)
Todo material DEVE ter:
1. **Capa leve (1 min de leitura):**
   - `titulo`: nome claro e direto
   - `subtitulo`: contexto curto em 1 linha
   - `explicacao_leiga`: "Para que serve?" em 1 ou 2 frases humanas (como explicando para um amigo)
   - `resumo_capa`: síntese executiva com as decisões, regras ou aprendizados principais (sem enrolação)
   - `gatilhos`: lista de 3 a 6 termos/frases de quando consultar este material
   - `coordenadas` (*Ir Direto ao Ponto*): de 1 a 5 atalhos com `rotulo`, `alvo` (no padrão da categoria) e `resumo`
2. **Livro Aberto (conteúdo aprofundado):**
   - Arquivo(s) completo(s) em Markdown, código ou roteiro detalhado, com numeração/seções coerentes com as `coordenadas` da Capa.

### 3. Como Executar a Inserção (Conforme o Seu Acesso)

#### Caso A — Você TEM acesso ao HTTP local (porta 4325)
Envie um `POST http://127.0.0.1:4325/api/guardar` (Content-Type: `application/json; charset=utf-8`) com o JSON abaixo. O servidor gera o próximo `LIV-NNN` automaticamente sem colisão e sincroniza o catálogo.

#### Caso B — Você TEM acesso ao disco/terminal (`D:\00 - Better Vault (Library)`)
1. Leia `D:\00 - Better Vault (Library)\SKILL.md` se precisar conferir detalhes.
2. Insira via `POST http://127.0.0.1:4325/api/guardar` (preferencial) OU crie `capas/LIV-NNN_<slug>.md` + `livros_abertos/LIV-NNN/<arquivo>` sempre em **UTF-8 sem BOM** e quebra de linha **LF** (nunca use `Set-Content`, `Out-File` ou `>` no PowerShell 5.1).
3. Rode obrigatoriamente ao final:
   - `python "D:\00 - Better Vault (Library)\bibliotecario.py" sincronizar`
   - `python "D:\00 - Better Vault (Library)\bibliotecario.py" testar`

#### Caso C — Você NÃO tem acesso ao PC (IA só de chat: ChatGPT Web, Claude Web, etc.)
Devolva a resposta **exclusivamente** no formato JSON abaixo (pronto para envio em `POST /api/guardar` ou para o Curador importar):

```json
{
  "titulo": "Título claro do material",
  "subtitulo": "Subtítulo curto em 1 linha",
  "categoria": "engenharia-e-codigo",
  "tipo": "codigo-fonte",
  "tempo_completo": "Ex: 15 min de leitura / 3 arquivos",
  "explicacao_leiga": "Para que serve em linguagem humana simples (1-2 frases).",
  "resumo_capa": "Resumo executivo de 1 minuto com as principais regras e conclusões.",
  "gatilhos": ["palavra-chave 1", "quando usar 2", "termo 3"],
  "nome_arquivo": "CONTEUDO_COMPLETO.md",
  "conteudo_arquivo": "# Título\n\nConteúdo aprofundado completo em Markdown...",
  "coordenadas": [
    {
      "rotulo": "Nome do ponto-chave",
      "alvo": "CONTEUDO_COMPLETO.md:5-25",
      "resumo": "O que o leitor encontra exatamente nesse trecho."
    }
  ]
}
```

### 4. Regras Rígidas de Qualidade
- Nunca invente linhas, páginas, minutos ou caminhos que não existam no conteúdo entregue.
- Nunca apague arquivos existentes do vault (descartes vão para `99_LIXEIRA/<data>/`).
- Confira se cada item de `coordenadas` realmente aponta para a parte certa de `conteudo_arquivo`.
```
