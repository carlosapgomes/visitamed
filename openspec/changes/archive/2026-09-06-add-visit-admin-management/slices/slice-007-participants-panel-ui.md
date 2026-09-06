# Slice 007 — Painel de participantes no dashboard

## Objetivo

Owner e admins passam a ver, no dashboard da visita em modo grupo, o painel de participantes: lista com papel e nome de exibição, e ações de remover / promover a admin / rebaixar a editor por linha. Editores/viewers não veem nada novo.

## Contexto necessário

- `src/views/dashboard-view.ts` (~1000 linhas, Lit): flags de papel `canDeleteGroupVisitForAll`/`canLeaveGroupVisit`/`canInvitePeople` (linhas ~351–365) e bloco de botões de ação (~790–830); modal de convite existente como referência de padrão de modal/states
- `src/services/auth/dashboard-actions-policy.ts` (+ `.test.ts`): política pura das ações do dashboard — ponto de extensão para as ações do painel
- Services prontos (slice 006): `fetchVisitMembersFromRemote`, `removeVisitMemberAsAdmin`, `updateVisitMemberRole`; `listVisitMembers` (cache)
- `src/models/visit-member.ts`: `displayName?` (slice 005); fallback de UI: uid truncado (ex.: primeiros 6 chars + `…`)
- Design tokens/estilo: `src/styles/` + AGENTS.md (mobile-first, botões grandes, alto contraste, sem animações complexas)

## Requisitos verificáveis

- **R1 — Visibilidade**: em visita `group`, owner/admin ativos veem a ação "Participantes"; editor/viewer/removido/sem-membership não veem (decisão pura na `dashboard-actions-policy`).
- **R2 — Lista**: abrir o painel carrega `fetchVisitMembersFromRemote` (fallback: cache via `listVisitMembers` em erro de rede com aviso) e exibe por linha: `displayName` ou uid truncado, badge de papel (`dono`/`admin`/`editor`/`viewer`) e estado (ativo/removido — removidos ocultos por padrão).
- **R3 — Ações por linha** (decisão pura testável): linha do owner ⇒ sem ações; linha do próprio usuário ⇒ sem ações de gerência; admin/editor/viewer ⇒ "Remover"; editor/viewer ⇒ "Promover a admin"; admin ⇒ "Rebaixar a editor".
- **R4 — Execução**: remover pede confirmação e chama `removeVisitMemberAsAdmin`; promover/rebaixar chama `updateVisitMemberRole`; sucesso ⇒ recarrega a lista; erro ⇒ mensagem inline com o status mapeado (`forbidden`, `target-not-found`, erro de rede).
- **R5 — Modo privado**: painel não aparece em visitas `private` (não há outros membros).
- **R6 — Admin pode sair**: a ação "Sair da visita" passa a aparecer também para `admin` ativo (hoje `canLeaveGroupVisit` só inclui editor/viewer em `dashboard-view.ts:355-358`); o endpoint existente já aceita (nega apenas owner). Sem isso, o admin ficaria sem self-service de saída, contradizendo o design D3.

## Matriz requisito -> arquivo -> teste/check

| Requisito | Arquivo(s) esperado(s) | Teste/check |
| --- | --- | --- |
| R1, R3 | `src/services/auth/dashboard-actions-policy.ts`, `.test.ts` | `npx vitest run src/services/auth/dashboard-actions-policy.test.ts` (RED/GREEN reais — funções puras) |
| R2, R4, R5, R6 | `src/views/dashboard-view.ts` | `npx vitest run src/views` + `npm run build` (typecheck) + smoke manual no `npm run dev` (roteiro abaixo) |
| R2 | `src/views/dashboard-view.ts` (helper de fallback de nome, se extraído) | teste do helper puro, se extraído para `utils/`/policy |

Roteiro smoke (2 contas de teste): owner abre painel → lista completa; promove editor a admin (2ª conta passa a ver painel no pull); admin remove editor; admin visualiza e usa "Sair da visita"; tentativas negadas exibem erro; editor não vê a ação "Participantes" nem perde/ganha botões além do esperado.

## Escopo e expected blast radius

```yaml
expected_files:
  - src/views/dashboard-view.ts
  - src/services/auth/dashboard-actions-policy.ts
  - src/services/auth/dashboard-actions-policy.test.ts
allowed_incidental_files:
  - src/styles/ (ajuste mínimo de tokens/classe compartilhada se o modal exigir; sem novo sistema de estilo)
out_of_scope:
  - modal de convite / papel admin no convite (slice 008)
  - invite-accept-view.ts
  - services (slice 006 já entregou; correções só se o smoke provar defeito — registrar)
  - realtime: painel atualiza por recarga/ação, sem listener novo
```

Escalar se: for preciso mudar `sync-service` (ex.: listener realtime) ou a estrutura de rotas — fora do escopo deste slice.

## Plano de testes do slice

### RED

- Comando: `npx vitest run src/services/auth/dashboard-actions-policy.test.ts`
- Falha esperada: novas funções de política (ex.: `canOpenParticipantsPanel(member)`, `getParticipantRowActions(member, currentMember)`) não existem → casos falham por "not a function".

### GREEN

- Mesmo comando — exit 0 com a matriz R1/R3 (owner, admin, editor, viewer, removido, self-row).

## Verificação do slice

- `npx vitest run src/services/auth src/views` — exit 0
- `npx eslint src/views/dashboard-view.ts src/services/auth --max-warnings 0` — exit 0
- `npm run build` — exit 0 (strict)
- Roteiro smoke executado e registrado

## Critérios de aceitação

- [ ] R1–R6 demonstrados (policy testada; UI por build + smoke)
- [ ] Editores/viewers sem nenhuma mudança visível no dashboard
- [ ] Design tokens usados; sem dependência nova

## Contrato de handoff

Worker: estender a policy (TDD) e wire no dashboard, provar RED/GREEN, rodar verificação + smoke e parar. Não atualizar tasks.md; não commitar.
