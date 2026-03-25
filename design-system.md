# WardFlow – Mini Design System (MVP 1)

## 🎯 Objetivo

Este design system define padrões visuais e estruturais para o WardFlow, um PWA mobile-first focado em captura rápida de notas clínicas transitórias durante rounds hospitalares.

Princípios:
- Simplicidade
- Velocidade
- Legibilidade
- Baixa fricção
- Consistência

---

## 📱 Contexto de uso

- Uso em pé, durante round
- Ambiente com distrações
- Uso com uma mão
- Interações rápidas (<5s)

---

## 🎨 Cores (Design Tokens)

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f9fafb;

  --color-text: #111827;
  --color-muted: #6b7280;

  --color-primary: #2563eb;
  --color-primary-pressed: #1d4ed8;

  --color-border: #e5e7eb;
  --color-danger: #dc2626;
}
```

### Uso

* Fundo principal: `--color-bg`
* Texto principal: `--color-text`
* Texto secundário: `--color-muted`
* Ações: `--color-primary`
* Bordas: `--color-border`

---

## 📏 Espaçamento

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
}
```

### Regra

* Use múltiplos de 8px sempre que possível
* Evitar layouts apertados

---

## 🔲 Bordas e Radius

```css
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

---

## 🔤 Tipografia

### Fonte

* Sistema (default do dispositivo)

### Tamanhos

```css
:root {
  --font-xs: 12px;
  --font-sm: 14px;
  --font-md: 16px;
  --font-lg: 18px;
  --font-xl: 20px;
}
```

### Uso

* Texto principal: 16px
* Labels: 14px
* Títulos de grupo: 18px
* Meta/auxiliar: 12–14px

---

## 🧱 Layout

### Container

* Padding horizontal: `16px`
* Max width: mobile-first (full width)

---

## 🔘 Botões

### Botão primário

```css
.button-primary {
  background: var(--color-primary);
  color: white;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: var(--font-md);
}
```

### Estados

* Pressed: `--color-primary-pressed`
* Disabled: reduzir opacidade

---

## ➕ Floating Action Button (FAB)

* Posicionado no canto inferior direito
* Tamanho: ~56px
* Ícone: "+"
* Alta prioridade visual

---

## 🧾 Inputs

### Estilo padrão

```css
.input {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px;
  font-size: var(--font-md);
}
```

### Regras

* Área de toque grande
* Placeholder explicativo
* Sem labels complexos

---

## 📦 Cards / List Items

```css
.card {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}
```

### Uso

* Lista de notas
* Itens simples, sem sombra pesada

---

## 📚 Agrupamentos

### Data group

* Título maior (font-lg)
* Espaçamento superior

### Ward group

* Levemente indentado
* Pode ser colapsável

---

## 🔽 Expand / Collapse

* Ícone: `▶` (fechado)
* Ícone: `▼` (aberto)

---

## 📋 Bottom Sheet (Menu de ações)

* Surge da parte inferior
* Fundo branco
* Itens clicáveis grandes

---

## 📤 Tela de Exportação

### Estrutura

* Header simples
* Área de preview com scroll
* Botões fixos no rodapé

---

## ⚠️ Mensagens e avisos

* Sempre discretos
* Exemplo:

> Evite dados sensíveis

---

## ✅ Feedback de ações

* Toast simples:

```
Mensagem copiada
```

---

## 🧠 Regras de UX

* Tudo deve ser utilizável com uma mão
* Ações principais sempre visíveis
* Tempo de interação < 5 segundos
* Evitar múltiplos passos
* Evitar navegação profunda

---

## 🚫 O que evitar

* Animações complexas
* Componentes pesados
* Layouts densos
* Dependência de bibliotecas externas

---

## 🎯 Filosofia

WardFlow não é um sistema complexo.

É uma ferramenta:

* rápida
* transitória
* confiável

Design deve refletir isso.

````

---

