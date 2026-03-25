1. 📱 Lista final de telas
2. 🧭 Navegação entre elas
3. 🧩 Wireframes (ASCII, direto ao ponto)
4. 🧠 Observações práticas de UX clínica

---

# 🧭 1. Telas do MVP

Você já acertou quase tudo. Eu só adicionaria **1 tela extra essencial**:

### ✅ Telas:

1. **Landing Page (pública)**
2. **Login (Firebase / Google)**
3. **Dashboard (lista de notas)**
4. **Nova Nota (formulário)**
5. **⚙️ Perfil / Configurações (mínimo, mas importante)**

👉 Essa última é útil para:

* logout
* configurar expiração (7 / 14 / 30 dias)
* reforçar disclaimers

---

# 🔄 2. Fluxo de navegação

```
Landing → Login → Dashboard → Nova Nota
                     ↓
                 Configurações
```

👉 Fluxo simples = menos fricção = mais adoção

---

# 📱 3. Wireframes (mobile-first)

---

# 🟢 1. LANDING PAGE

```
----------------------------------
| WardFlow                        |
|                                |
| Notas rápidas e temporárias    |
| para o round clínico           |
|                                |
| Capture pendências no momento  |
| — sem virar prontuário         |
|                                |
| [ Entrar com Google ]          |
|                                |
| ----------------------------   |
| ✔ Sem armazenamento permanente |
| ✔ Expiração automática         |
| ✔ Feito para uso no round      |
| ----------------------------   |
|                                |
| * Não é um prontuário médico   |
----------------------------------
```

---

# 🟢 2. LOGIN

(Simples — pode até pular se usar Firebase direto)

```
----------------------------------
| WardFlow                (logo)  |
|                                |
| [ Entrar com Google ]          |
|                                |
|                                |
| * Uso para anotações rápidas   |
| * Não armazenar dados sensíveis|
----------------------------------
```

---

# 🟢 3. DASHBOARD (principal)

👉 ESSA é a tela mais importante do produto

```
----------------------------------
| ☰ WardFlow            👤        |
----------------------------------
|                                |
| 📅 Hoje                        |
|   ▶ Intermediário              |
|     - I04A  | RX pendente      |
|     - I04B  | alta amanhã      |
|                                |
|   ▶ UTI                         |
|     - U02   | ajustar droga    |
|                                |
| 📅 Ontem                       |
|   ▶ Intermediário              |
|     - I03A  | avaliar exame    |
|                                |
|                                |
|                                |
|                                |
|                  ➕ Nova Nota   |
----------------------------------
```

---

## 🧠 Comportamento esperado

* grupos por **data**
* dentro: **ala/setor**
* dentro: **notas**
* tudo **expandível/recolhível**

👉 isso escala bem mesmo com muitas notas

---

# 🟢 4. NOVA NOTA (formulário)

👉 precisa ser extremamente rápido

```
----------------------------------
| ← Nova Nota                    |
----------------------------------
|                                |
| Ala / Setor                    |
| [ Intermediário        ▼ ]     |
|                                |
| Leito                          |
| [ I04A                 ]       |
|                                |
| Referência (opcional)          |
| [ AB                   ]       |
| (ex: iniciais)                |
|                                |
| Nota                           |
| [ aguarda RX torax     ]       |
|                                |
| ⚠ Evite dados sensíveis        |
|                                |
|                                |
| [ Salvar ]                     |
----------------------------------
```

---

## 🔥 Evolução futura (não MVP)

* 🎤 botão de voz
* auto-parse (fala → campos)

---

# 🟢 5. CONFIGURAÇÕES / PERFIL

```
----------------------------------
| ⚙️ Configurações               |
----------------------------------
| 👤 Dr. João Silva              |
|                                |
| ⏳ Expiração das notas         |
| (•) 14 dias (recomendado)      |
| ( ) 7 dias                     |
| ( ) 30 dias                    |
|                                |
|                                |
| ⚠ Não é prontuário médico      |
| Uso para notas temporárias     |
|                                |
|                                |
| [ Logout ]                     |
----------------------------------
```

---

# 🧠 4. Detalhes críticos de UX (isso faz diferença real)

---

## ⚡ 1. Botão “Nova Nota” sempre acessível

* fixo no canto inferior (FAB)
* acessível com uma mão

👉 essencial no round

---

## ⚡ 2. Tempo de criação < 5 segundos

Meta:

* abrir form
* preencher
* salvar

👉 sem pensar

---

## ⚡ 3. Evitar navegação profunda

Nada de:

* múltiplas telas
* menus complexos

👉 tudo direto

---

## ⚡ 4. Visual limpo (modo “hospital”)

* fundo claro
* contraste alto
* fontes grandes

👉 uso em pé, ambiente caótico

---

## ⚡ 5. Estado vazio (muito importante)

Dashboard vazio:

```
----------------------------------
| Nenhuma nota ainda             |
|                                |
| Comece registrando pendências  |
| do seu round                   |
|                                |
|        ➕ Nova Nota            |
----------------------------------
```

---

# 🧠 Possível tela extra (opcional)

Se quiser evoluir depois:

### 🔍 Busca / filtro

* por ala
* por leito

Mas NÃO precisa no MVP

---

# 🎯 Resumo

Você tem um MVP muito bem definido:

### ✔️ Telas finais:

* Landing
* Login
* Dashboard ⭐
* Nova Nota ⭐
* Configurações

---

### ✔️ Diferencial forte:

* agrupamento por data + ala
* foco em velocidade
* modelo mental clínico

---

