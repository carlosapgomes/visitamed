# AGENTS.md – WardFlow Agent Guidelines

## Visão Geral

Este documento define diretrizes para desenvolvimento do WardFlow com assistência de agentes de IA.

WardFlow é um PWA mobile-first para captura de notas clínicas transitórias durante rounds hospitalares.

Este NÃO é um sistema de prontuário.  
O foco é:
- velocidade
- simplicidade
- uso offline
- baixo atrito

---

## 🎯 Princípios Fundamentais

### 1. Simplicidade acima de tudo
- Evitar abstrações desnecessárias
- Preferir soluções diretas
- Não antecipar features futuras (YAGNI)

### 2. Desenvolvimento incremental
- Cada mudança deve resultar em código funcional
- Sempre manter o app rodando
- Evitar grandes refatorações

### 3. Código legível e previsível
- Nomes descritivos
- Funções pequenas
- Responsabilidade única
- Comentários apenas para explicar "por que"

---

## 🧱 Stack Tecnológica

### Obrigatório
- Vite
- TypeScript (strict mode)
- Lit
- Dexie (IndexedDB)
- Firebase (Auth + Firestore)
- vite-plugin-pwa

### Proibido
- Tailwind CSS
- Bibliotecas pesadas de UI (Material, Ant, etc.)
- State managers externos (Redux, Zustand, etc.)

---

## 📁 Estrutura de Pastas

```

src/
├── components/     # Componentes reutilizáveis
│   ├── base/
│   ├── layout/
│   ├── groups/
│   ├── items/
│   ├── forms/
│   └── feedback/
├── views/          # Telas (nível de rota)
├── services/       # Lógica compartilhada e integrações
│   ├── db/
│   ├── auth/
│   ├── sync/
│   └── export/
├── styles/
├── models/
├── router/
├── config/
└── utils/

````

---

## 🧠 Responsabilidades

### views/
- Representam telas completas
- Orquestram estado, serviços e fluxo
- Podem chamar services diretamente

### components/
- Blocos reutilizáveis
- Focados em UI e interação local
- Devem evitar depender diretamente de services

### services/
- Lógica de negócio compartilhada
- Persistência, sync, integração externa
- Funções puras sempre que possível

### Regra importante
- Não duplicar responsabilidades entre views e components
- Um "dashboard-view" deve existir apenas em `views/`

---

## 🎨 Design System

### Usar sempre design tokens

```css
--color-bg: #ffffff;
--color-surface: #f9fafb;
--color-text: #111827;
--color-muted: #6b7280;
--color-primary: #2563eb;
--color-border: #e5e7eb;
--color-danger: #dc2626;
````

### Espaçamento

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
```

### Tipografia

```css
--font-xs: 12px;
--font-sm: 14px;
--font-md: 16px;
--font-lg: 18px;
--font-xl: 20px;
```

### Regras visuais

* Mobile-first
* Alto contraste
* Botões grandes
* Layout simples
* Sem animações complexas

---

## 🧾 Convenções de Código

### Componentes Lit

* Arquivo: kebab-case.ts
* Classe: PascalCase
* Tag: kebab-case

### Models

* Interfaces TypeScript
* Tipos simples e claros
* Factory functions são opcionais

### Services

* Evitar estado global complexo
* Preferir funções puras
* Encapsular acesso a dados

---

## 🔄 Fluxo de Trabalho com Agentes

### Sempre trabalhar em slices pequenos

Cada prompt deve:

* ter escopo claro
* implementar uma única responsabilidade
* não modificar partes não relacionadas

### Prompt bom

```
Crie um componente <note-item> que renderiza leito e nota.
```

### Prompt ruim

```
Implemente o dashboard completo com todas as features.
```

---

## 🧩 Definition of Done (por slice)

Cada slice deve:

* compilar sem erros
* passar lint
* manter o app funcional
* não quebrar funcionalidades existentes
* não adicionar dependências novas sem necessidade
* implementar apenas o que foi pedido

---

## 🚫 Regras de Escopo

Ao implementar uma tarefa:

* alterar o menor número possível de arquivos
* não refatorar código não relacionado
* não reorganizar estrutura sem necessidade
* não renomear arquivos existentes sem justificativa clara

---

## 🧪 Testes (TDD – uso seletivo)

### Usar TDD para:

* funções puras
* transformação de dados
* agrupamento de notas
* geração de mensagens
* expiração de dados

### Não priorizar TDD para:

* layout
* componentes visuais
* estrutura inicial

---

## 🔪 Estratégia: Vertical Slicing

Desenvolvimento deve seguir slices verticais funcionais.

### Ordem recomendada:

1. Core UI + persistência local
2. Exportação de mensagem
3. Autenticação (Google)
4. Sincronização
5. Refinamentos de UX

---

## ⚠️ O que evitar

### Overengineering

* abstrações prematuras
* padrões complexos sem necessidade

### Bibliotecas desnecessárias

* não adicionar deps sem justificativa

### Acoplamento excessivo

* separar UI e lógica
* manter responsabilidades claras

---

## ✅ Checklist de Qualidade

* TypeScript strict sem erros?
* Usa design tokens?
* Código legível?
* Sem duplicação?
* Sem abstrações desnecessárias?
* Escopo respeitado?

---

## 🧠 Filosofia do Produto

WardFlow é:

* rápido
* transitório
* simples
* confiável

O código deve refletir isso.

---

## 📌 Nota Final

Este documento é a fonte de verdade para decisões arquiteturais.

Se houver dúvida:
→ escolher sempre a solução mais simples e incremental.

```

---

