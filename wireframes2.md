. 📱 **Dashboard atualizado (com exportação)**
. 🧾 **Tela / Modal “Gerar mensagem”**
. 🔄 **Fluxo de interação**
. 🧠 Pequenos detalhes que fazem MUITA diferença na prática

--

# 📱 1. DASHBOARD (wireframe atualizado)

```text
------------------------------------------------
| ☰ WardFlow                          ⤴   👤   |
------------------------------------------------
|                                                |
| 📅 Hoje                                [⋯]     |
|                                                |
|   ▼ Intermediário                    [⋯]        |
|     I04A  | aguarda RX                        |
|     I04B  | preparar operatório              |
|                                                |
|   ▶ UTI                              [⋯]        |
|                                                |
| 📅 Ontem                              [⋯]       |
|                                                |
|   ▶ Intermediário                    [⋯]        |
|                                                |
|                                                |
|                                                |
|                                  ➕ Nova Nota   |
------------------------------------------------
```

---

## 🧩 Elementos novos importantes

### 🔹 `[⋯]` no nível DATA (Hoje / Ontem)

Ações para:

* exportar **todas as notas daquele dia**

---

### 🔹 `[⋯]` no nível ALA/SETOR

Ações para:

* exportar **só aquela ala**

---

### 🔹 Ícone no topo `⤴`

👉 exportação global (opcional futuro)

Para MVP, pode até esconder — mas já deixei previsto

---

# 📲 2. MENU DE AÇÕES (bottom sheet)

Quando clicar em `[⋯]` de **Intermediário**:

```text
------------------------------
| Intermediário              |
|----------------------------|
| 👁 Pré-visualizar          |
| 📋 Copiar mensagem         |
| 📤 Compartilhar            |
------------------------------
```

Quando clicar em `[⋯]` de **Hoje**:

```text
------------------------------
| Hoje                       |
|----------------------------|
| 👁 Pré-visualizar          |
| 📋 Copiar resumo do dia    |
| 📤 Compartilhar            |
------------------------------
```

👉 isso mantém consistência mental

---

# 🧾 3. TELA / MODAL “GERAR MENSAGEM”

👉 Pode ser:

* tela full (melhor)
* ou bottom sheet grande

---

## Wireframe

```text
------------------------------------------------
| ← Gerar mensagem                             |
------------------------------------------------
|                                                |
| Escopo                                        |
| (•) Hoje                                      |
| ( ) Intermediário                             |
| ( ) UTI                                       |
|                                                |
| Formato                                       |
| (•) Lista simples                             |
| ( ) Negrito leve                              |
|                                                |
| Prévia                                        |
| --------------------------------------------  |
| *Pendências de hoje*                          |
|                                               |
| *Intermediário*                               |
| - I04A: aguarda RX                            |
| - I04B: preparar operatório                   |
|                                               |
| *UTI*                                         |
| - U02: discutir antibiótico                   |
| --------------------------------------------  |
|                                                |
|                                                |
| [ 📋 Copiar ]   [ 📤 Compartilhar ]           |
------------------------------------------------
```

---

# ✨ 4. Versão simplificada (MVP ainda mais enxuto)

Se quiser reduzir complexidade:

👉 NÃO mostrar seleção de escopo

E abrir já direto com:

* escopo fixo (ex: Intermediário)
* preview
* botões

---

## Exemplo:

```text
------------------------------------------------
| ← Intermediário                              |
------------------------------------------------
|                                                |
| Prévia                                        |
| --------------------------------------------  |
| *Intermediário*                               |
| - I04A: aguarda RX                            |
| - I04B: preparar operatório                   |
| --------------------------------------------  |
|                                                |
| [ 📋 Copiar ]   [ 📤 Compartilhar ]           |
------------------------------------------------
```

👉 isso é mais rápido e suficiente pro MVP

---

# 🔄 5. Fluxo real (uso no hospital)

### Cenário 1 — rápido (mais comum)

1. abre dashboard
2. toca `[⋯]` em Intermediário
3. toca **Copiar mensagem**
4. cola no WhatsApp

👉 tempo total: ~3–5 segundos

---

### Cenário 2 — revisar antes

1. `[⋯]` → Pré-visualizar
2. olha
3. copiar

---

### Cenário 3 — resumo do dia

1. `[⋯]` em “Hoje”
2. copiar
3. enviar no grupo

---

# 🧠 6. Detalhes que fazem MUITA diferença

---

## ⚡ Feedback de ação

Depois de copiar:

```text
✅ Mensagem copiada
```

👉 indispensável

---

## ⚡ Scroll inteligente na prévia

* sempre começar no topo
* texto selecionável
* fácil de copiar manualmente também

---

## ⚡ Formatação pensada pra WhatsApp

Evite:

* markdown complexo
* emojis excessivos

Prefira:

```text
*Intermediário*
- I04A: aguarda RX
```

---

## ⚡ Separação clara por ala

Isso ajuda muito quem recebe:

* residente
* plantonista
* equipe

---

## ⚡ Ordem consistente

Sempre:

1. Hoje
2. A ordem das alas
3. Ordem dos leitos

👉 previsibilidade = confiança

---

