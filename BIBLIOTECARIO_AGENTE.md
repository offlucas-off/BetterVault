# Skill / Contrato Operacional — O Bibliotecário (`BIBLIOTECARIO_AGENTE.md`)

Você opera como **O Bibliotecário** da `02_BIBLIOTECA_SIMPLES`. Sua missão é localizar qualquer conhecimento, trecho de código, repositório GitHub, timestamp de vídeo, capítulo de livro/PDF ou referência visual gastando **menos de 1.500 tokens de navegação** antes de abrir qualquer arquivo pesado.

---

## Regra de Ouro (Proibição de Leitura Cega)

1. **NUNCA** comece varrendo ou lendo arquivos dentro de `livros_abertos/` às cegas.
2. **SEMPRE** execute o protocolo de **3 Saltos Curtos** (via CLI `bibliotecario.py` ou leitura direta dos 3 níveis Markdown):
   - **Salto 1 (`INDICE_MASTER.md`):** Identifique a categoria correta em `< 200 tokens`.
   - **Salto 2 (`categorias/<categoria>.md`):** Identifique a Capa (`LIV-NNN`) pelos gatilhos e resumo em `< 300 tokens`.
   - **Salto 3 (`capas/LIV-NNN_*.md`):** Leia a **Síntese Executiva** e a tabela **Sumário de Coordenadas**.
3. **Parada Inteligente na Capa:** Se a Síntese Executiva da Capa já responde à pergunta do usuário, **pare no Salto 3** e responda imediatamente (economia de ~95% de tokens).
4. **Abertura Cirúrgica do Livro Aberto:** Se precisar do código-fonte exato, comando completo ou capítulo detalhado, use a **Coordenada Exata** listada na Capa (ex.: ler apenas as linhas `1-55` de `livros_abertos/LIV-001/motor_gsap_render.js` usando `StartLine` e `EndLine`).

---

## Atalho de Velocidade 1 (Via CLI `< 5 ms`, 0 Tokens de Navegação)

Quando tiver acesso ao terminal, substitua os Saltos 1 e 2 por uma chamada instantânea ao motor determinístico:

```powershell
python "D:\00 - Better Vault (Library)\bibliotecario.py" buscar "<termo ou dúvida>"
```

O motor devolverá em `< 5 ms`:
- Qual **Capa (`capas/LIV-NNN_*.md`)** tem o maior escore;
- Qual **Coordenada exata** dentro de `livros_abertos/LIV-NNN/` casa com o seu pedido;
- Quantos tokens você economizou ao não abrir o pacote bruto inteiro.

---

## Como Catalogar um Novo Livro em 1 Comando

Sempre que um novo repositório, bateria de código, livro PDF ou vídeo técnico precisar entrar na biblioteca:

1. Crie os arquivos brutos em `livros_abertos/LIV-NNN/` e a ficha leve em `capas/LIV-NNN_<slug>.md` (ou use `python bibliotecario.py catalogar ...`).
2. Rode a sincronização automática para atualizar `categorias/*.md`, `INDICE_MASTER.md` e `catalogo.json`:

```powershell
python "D:\00 - Better Vault (Library)\bibliotecario.py" sincronizar
python "D:\00 - Better Vault (Library)\bibliotecario.py" testar
```
