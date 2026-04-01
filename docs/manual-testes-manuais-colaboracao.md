# Manual de Testes Manuais — Colaboração + Tags (WardFlow)

> Última atualização: 2026-04-01
> Escopo: slices S1 → S10 concluídos

## 1) Objetivo

Este manual valida ponta a ponta:
- colaboração por visita (membros, convites, ACL)
- sync/offline/realtime
- modelo de tags (dashboard + export)
- regras de negócio críticas (remove-tag-ou-nota, delete > update)

---

## 2) Pré-requisitos

- Build local atualizada:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
- Firebase de teste acessível
- Dois usuários Google para testes colaborativos:
  - **Usuário A** (owner)
  - **Usuário B** (editor/viewer)
- Opcional: terceiro usuário para acesso negado

---

## 3) Smoke test (5 min)

- [ ] Login funciona
- [ ] Tela de visitas carrega
- [ ] Criar visita funciona
- [ ] Criar nota com tags funciona
- [ ] Dashboard exibe grupos por tag
- [ ] Copiar/compartilhar/exportar funciona
- [ ] Logout funciona

Se falhar aqui, parar e corrigir antes da suíte completa.

---

## 4) Suíte completa

## A. Auth + Roteamento

### A1. Redirect pós-login com `next`
1. Deslogado, abrir URL protegida (ex.: `/visita/:id`).
2. Confirmar redirecionamento para `/login?next=...`.
3. Efetuar login.

**Esperado**: volta para rota original, sem open redirect.

### A2. Acesso direto ao login estando logado
1. Logado, abrir `/login`.

**Esperado**: redireciona para rota padrão válida (dashboard/visitas).

---

## B. Visitas + Membership + Permissões

### B1. Criar visita privada
1. Logar como A.
2. Criar nova visita.

**Esperado**:
- visita criada
- A é owner ativo

### B2. Permissão por papel no dashboard
Preparação: mesma visita com A owner, B editor/viewer.

- **viewer**:
  - [ ] vê notas
  - [ ] consegue copy/share/export
  - [ ] **não** consegue editar/deletar nota
- **editor**:
  - [ ] consegue editar/deletar nota
  - [ ] **não** gerencia membros/convites

---

## C. Convites e Aceite

### C1. Aceitar convite por token
1. A gera convite para visita.
2. B abre link/token deslogado.
3. Faz login e conclui aceite.

**Esperado**: B entra na visita com papel correto.

### C2. Revogação/remoção
1. A remove B da visita.
2. B tenta abrir rota da visita.

**Esperado**:
- acesso removido/negado
- sem leitura/edição da visita

---

## D. Notas + Tags (fonte de verdade)

### D1. Criar nota exige tags
1. Abrir nova nota.
2. Preencher ala/leito/nota sem tags.

**Esperado**: bloqueia salvar (mensagem exigindo ao menos 1 tag).

### D2. Multi-tags
1. Criar nota com tags `UTI, CARDIO`.
2. Salvar.

**Esperado**: nota aparece em ambos grupos de tag no dashboard.

### D3. Remover tag em edição
1. Abrir nota com 2 tags.
2. Remover uma tag.

**Esperado**: nota continua existente com tag remanescente.

### D4. Remover última tag
1. Abrir nota com 1 tag.
2. Remover a última tag.

**Esperado**: nota é excluída e fluxo volta para a visita.

---

## E. Dashboard por tags

### E1. Agrupamento
1. Criar notas em uma mesma data com tags variadas.

**Esperado**:
- grupos por tag dentro da data
- nota multi-tag aparece em múltiplos grupos

### E2. Ordenação de leitos dentro da tag
Criar leitos: `i04b`, `i04d`, `i04a` no mesmo grupo de tag.

**Esperado**: ordem `i04a`, `i04b`, `i04d` (string ascendente).

---

## F. Export (alinhado ao dashboard)

### F1. Export por tag
1. Abrir action de uma tag.
2. Pré-visualizar/copiar mensagem.

**Esperado**: bloco com título da tag e linhas `- LEITO | nota`.

### F2. Export por data
1. Abrir action da data.

**Esperado**: `*Pendências*` com seções por tags.

### F3. Share fallback
1. Em ambiente sem `navigator.share`, acionar compartilhar.

**Esperado**: fallback para copiar mensagem.

---

## G. Offline + Sync + Conflitos

### G1. Offline create/update
1. Ficar offline.
2. Criar/editar nota.
3. Voltar online.

**Esperado**: sincroniza ao reconectar; status converge.

### G2. Delete > Update na fila
1. Gerar cenário offline: update e depois delete da mesma nota.
2. Reconectar.

**Esperado**: delete vence; nota não ressuscita.

### G3. Remoção de acesso com pendências
1. B edita offline.
2. A remove B da visita.
3. B reconecta.

**Esperado**: pendências de B para visita removida são descartadas.

---

## H. Realtime (visita ativa)

### H1. Listener só da visita aberta
1. Em dois dispositivos/abas, abrir visita X no A e editar nota.
2. No B, com visita X aberta, observar atualização.
3. Navegar B para outra rota sem `visitId`.
4. Alterar X no A novamente.

**Esperado**:
- atualização em tempo real apenas quando X está aberta
- ao sair da visita, listener é encerrado

---

## I. Duplicar visita

### I1. Duplicação para privada
1. Em visita colaborativa, executar duplicar.

**Esperado**:
- nova visita independente
- owner da nova visita = usuário atual
- notas duplicadas com tags preservadas

---

## J. Segurança básica de isolamento

### J1. Acesso cruzado
1. Usuário C (sem membership) tenta abrir visita de A.

**Esperado**: acesso negado.

### J2. Operações de escrita sem permissão
1. Viewer tenta editar/deletar nota.

**Esperado**: bloqueio de UI e/ou erro de permissão remoto.

---

## 5) Registro de execução (template)

| Caso | Status (OK/FALHA) | Evidência | Observações |
|---|---|---|---|
| A1 |  |  |  |
| A2 |  |  |  |
| ... |  |  |  |

---

## 6) Critério para liberar release

- Todos os casos críticos OK:
  - A1, B2, C2, D4, E2, F1/F2, G2/G3, H1, I1, J1
- Sem regressão visual severa
- Sem erro bloqueante de auth/sync/export
