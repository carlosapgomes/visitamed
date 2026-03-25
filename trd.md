1. 📄 **TRD do MVP 1 (enxuto e executável)**
2. 🧠 **Estratégia de uso dos wireframes + prompts para GLM5 (isso é o mais importante)**

---

# 📄 PARTE 1 — TRD (Technical Requirements Document) MVP 1

Vou manter isso **cirúrgico**, focado em algo que você consiga realmente implementar.

---

# 🧾 1. Visão do sistema

**Nome:** WardFlow
**Tipo:** PWA (mobile-first)
**Objetivo:**
Capturar, organizar e exportar **notas transitórias de round clínico**

---

# 🎯 2. Objetivo do MVP

Permitir que o usuário:

* faça login com Google
* crie notas rápidas (ala + leito + referência + nota)
* visualize notas agrupadas por:

  * data
  * ala/setor
* exporte notas como mensagem (copiar / compartilhar)
* tenha expiração automática (default 14 dias)

---

# 🚫 Fora do escopo (MVP 1)

* ASR (voz)
* armazenamento de áudio
* multi-usuário colaborativo
* busca avançada
* edição complexa
* notificações

---

# 🏗️ 3. Arquitetura

## Frontend

* Vite
* TypeScript
* Lit

## Dados locais

* Dexie (IndexedDB)

## Backend

* Firebase Auth (Google)
* Firestore (sync opcional)

## PWA

* vite-plugin-pwa ou Workbox

---

# 🧠 4. Modelo de dados (essencial)

## Tabela: `notes`

```ts
{
  id: string
  userId: string
  date: string // YYYY-MM-DD
  ward: string
  bed: string
  reference?: string
  note: string
  createdAt: number
  expiresAt: number
  syncStatus: 'pending' | 'synced'
}
```

---

## Tabela: `settings`

```ts
{
  userId: string
  expirationDays: number // default: 14
}
```

---

## Tabela: `sync_queue`

```ts
{
  id: string
  type: 'create' | 'delete'
  payload: any
  createdAt: number
}
```

---

# 📱 5. Telas (definição funcional)

## 1. Landing

* CTA: login com Google
* posicionamento (não prontuário)

---

## 2. Login

* Firebase Google Auth

---

## 3. Dashboard ⭐

### Deve:

* listar notas agrupadas por:

  * data
  * ala
* permitir expand/collapse
* botão “Nova Nota”
* ações `[⋯]` por grupo:

  * copiar
  * compartilhar
  * pré-visualizar

---

## 4. Nova Nota ⭐

Campos:

* Ala / Setor
* Leito
* Referência (opcional)
* Nota

Ações:

* salvar
* voltar

---

## 5. Gerar Mensagem ⭐

* preview do texto
* botões:

  * copiar
  * compartilhar

---

## 6. Configurações

* expiração (7 / 14 / 30)
* logout

---

# 🔄 6. Fluxos principais

## Criar nota

```plaintext
Dashboard → Nova Nota → Salvar → aparece no topo
```

---

## Exportar

```plaintext
Dashboard → [⋯] grupo → copiar → colar no WhatsApp
```

---

## Expiração

* ao carregar dashboard:

  * remover notas expiradas automaticamente

---

# ⚙️ 7. Regras de negócio

* nota SEMPRE tem:

  * ala
  * leito
  * texto

* referência é opcional

* expiração obrigatória (default 14 dias)

* ordenação:

  * data desc
  * ala
  * leito

---

# 📤 8. Formatação de mensagem

### Exemplo:

```text
*Pendências de hoje*

*Intermediário*
- I04A: aguarda RX
- I04B: preparar operatório

*UTI*
- U02: discutir antibiótico
```

---

# 🧪 9. Critérios de aceite

### Criar nota

* salva em < 200ms
* aparece imediatamente

### Dashboard

* agrupamento correto
* expand/collapse funcional

### Exportação

* mensagem correta
* copiar funciona
* compartilhar funciona (quando suportado)

### Offline

* app abre sem internet
* notas persistem

---

# 🧠 PARTE 2 — Estratégia com Wireframes + GLM5

Agora vem a parte mais importante da sua pergunta.

---

# 🎯 Sua ideia: usar GLM5 com prompts por fase

👉 Isso é excelente
👉 Mas precisa de **estrutura correta**, senão vira código bagunçado

---

# 🧠 Onde entram os wireframes?

## ❌ NÃO usar wireframes só no início

## ✅ Usar wireframes como BASE de cada slice

---

# 🔥 Estratégia ideal

## Etapa 1 — Wireframe → Componente

Para cada tela:

```plaintext
Wireframe → Component breakdown → Prompt
```

---

## Exemplo (Dashboard)

Wireframe → vira:

* `<app-header>`
* `<date-group>`
* `<ward-group>`
* `<note-item>`
* `<floating-action-button>`

---

# 🧠 Etapa 2 — Prompt por slice (não por tela inteira)

❌ errado:

> “crie o dashboard”

✅ certo:

> “crie componente date-group com expand/collapse”

---

# 🧱 Estrutura de execução com GLM5

## Fase 1 — Setup

* projeto Vite + Lit
* estrutura básica
* Dexie setup

---

## Fase 2 — Data layer

* schema Dexie
* CRUD notes
* expiração

---

## Fase 3 — UI base

* layout
* header
* navegação

---

## Fase 4 — Dashboard

Slices:

1. listagem simples
2. agrupamento por data
3. agrupamento por ala
4. expand/collapse
5. ações `[⋯]`

---

## Fase 5 — Nova Nota

* form
* validação
* persistência

---

## Fase 6 — Exportação

* função de geração de texto
* modal preview
* copy/share

---

## Fase 7 — Auth + Sync

* login Google
* sync Firestore

---

# 🧠 Regra de ouro para GLM5

👉 **Cada prompt = um componente OU uma função isolada**

Nunca:

* múltiplas responsabilidades
* múltiplas telas

---

# ✨ Exemplo de prompt bom

```plaintext
Crie um componente Lit chamado <ward-group> que:

- recebe uma lista de notas
- exibe título da ala
- permite expand/collapse
- renderiza lista de <note-item>

Use TypeScript e estilo minimalista mobile-first
```

---

# 🚫 Exemplo ruim

```plaintext
Crie todo o dashboard com agrupamento, ações, firebase e exportação
```

---

# 🧠 Insight importante

Você não está usando o GLM5 como “gerador de app”

👉 você está usando como **assistente de construção incremental**

---

# 🎯 Minha recomendação final

### Ordem ideal:

1. Wireframes ✅ (já temos)
2. TRD ✅ (acabamos de fazer)
3. **Component breakdown** ← próximo passo
4. Prompts por slice
5. Implementação iterativa

---

