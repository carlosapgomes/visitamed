# Slice 002 — Convites com papel `admin` (modelo + service + rules de invites)

## Objetivo

Convites podem ser criados por admins (além do owner) e podem conceder o papel `admin`. As regras do Firestore de `invites` passam a aceitar escrita/leitura por admins, com whitelist de papéis.

## Contexto necessário

- `src/models/visit-invite.ts` — `InviteRole = 'editor' | 'viewer'`, `createVisitInvite`, `isInviteActive`, `revokeInvite`
- `src/services/db/visit-invites-service.ts` — `validateCanManageInvites` (linha ~148) usa `canManageInvites` (slice 001 já inclui admin); `createVisitInviteForVisit` (linha ~169) e `revokeVisitInvite`/`listActiveVisitInvites` (linha ~229)
- `firestore.rules` — bloco `match /visits/{visitId}/invites/{inviteId}` (`read, write: if isOwner(...)`); helpers na topomarca do arquivo
- Testes: `src/models/visit-invite.test.ts`, `src/services/db/visit-invites-service.test.ts`
- Padrão de teste no emulador (se disponível): `firebase emulators:exec` com script contra as rules; caso o emulador não esteja configurado no ambiente, validar por inspeção linha a linha e registrar no relatório

## Requisitos verificáveis

- **R1** — `InviteRole` inclui `'admin'`; `createVisitInvite` aceita input com `role: 'admin'` (mudança de tipos; sem RED de runtime — teste documenta regressão).
- **R2** — `createVisitInviteForVisit` e `revokeVisitInvite` NÃO lançam erro quando o membro atual é admin ativo (pós slice 001, `canManageInvites(admin) === true`; os testes evitam regressão de permissão no service).
- **R3** — Rules de invites **separadas por operação** (nunca `write` amplo — rules são OR e a regra ampla atual `read, write: if isOwner(...)` anulária as validações): `read: isOwner(...) || isAdmin(...)` (helper `isAdmin` novo: membro ativo com `role in ['owner','admin']`, reutilizado pelos slices seguintes); `create` com validações completas; `update` mantendo integridade.
- **R4** — Rules de `create` de invite: `request.resource.data.role in ['admin','editor','viewer']` (owner continua proibido) && `request.resource.data.createdByUserId == request.auth.uid` && `request.resource.data.visitId == visitId` (coerência com o caminho) && **`request.resource.data.createdAt == request.time`** (ancoragem server-side — base confiável para a regra de re-entrada do slice-005, ver design D6).
- **R5** — Rules de `update` de invite (revogação): `role` imutável pós-criação (`request.resource.data.role == resource.data.role`) e `visitId`/`createdByUserId` preservados; só `revokedAt`/`updatedAt` mudam.

## Matriz requisito -> arquivo -> teste/check

| Requisito | Arquivo(s) esperado(s) | Teste/check |
| --- | --- | --- |
| R1 | `src/models/visit-invite.ts`, `src/models/visit-invite.test.ts` | `npx vitest run src/models/visit-invite.test.ts` |
| R2 | `src/services/db/visit-invites-service.test.ts` | `npx vitest run src/services/db/visit-invites-service.test.ts` |
| R3–R5 | `firestore.rules`, `scripts/rules-smoke.mjs` (runbook R1) | `firebase emulators:exec --only firestore "node scripts/rules-smoke.mjs"`: admin cria invite válido → permitido; editor cria → negado; `role:'owner'` → negado; `createdAt != request.time` → negado; update trocando role → negado; revogação → permitida |

## Escopo e expected blast radius

```yaml
expected_files:
  - src/models/visit-invite.ts
  - src/models/visit-invite.test.ts
  - src/services/db/visit-invites-service.ts
  - src/services/db/visit-invites-service.test.ts
  - firestore.rules
allowed_incidental_files: []
out_of_scope:
  - regras de members (slice 003)
  - endpoints/functions
  - UI do modal de convite (slice 008)
  - acceptInvite endpoint (slice 005)
  - mudança no formato de leitura de invites existentes (convites antigos têm createdAt client-side; a validação vale só para novos creates)
```

Escalar se: a validação `createdAt == request.time` mostrar-se incompatível com algum fluxo existente de escrita de invites (ex.: backfill) — os convites ativos criados antes do deploy continuam legíveis/revogáveis pelas regras `read`/`update`.

## Plano de testes do slice

### RED

- Vitest (R2): `npx vitest run src/services/db/visit-invites-service.test.ts` — novos casos "admin cria/revoga convite sem erro". Falha esperada: nenhum (pós slice 001) OU falham se o service tiver checagem adicional hardcoded de owner — se passarem de imediato, registre como teste de regressão e o RED efetivo é o do emulador.
- Rules (R3–R5, RED real): `firebase emulators:exec --only firestore "node scripts/rules-smoke.mjs"` contra as rules atuais — escrita de invite por admin é negada (`PERMISSION_DENIED`) e a matriz do runbook R1 diverge (exit != 0).

### GREEN

- Vitest: mesmos comandos com exit 0.
- Emulador: matriz R1 do runbook (`slices/emulator-runbook.md`) executada verde — todas as linhas de invites (admin ok; editor negado; role owner negado; createdAt forjado negado; update trocando role negado; revogação ok).

## Verificação do slice

- `npx vitest run src/models src/services/db/visit-invites-service.test.ts` — exit 0
- `npx eslint src/models/visit-invite.ts src/services/db/visit-invites-service.ts --max-warnings 0` — exit 0
- Matriz R1 do runbook (`slices/emulator-runbook.md`) executada e verde; se o ambiente não tiver Firebase CLI, registrar bloqueio e escalar (inspeção estática sozinha não fecha R3–R5)

## Critérios de aceitação

- [ ] R1–R4 demonstrados
- [ ] Fluxos existentes de owner (criar/revogar/listar) sem regressão nos testes
- [ ] Papel `owner` permanece proibido em convites

## Contrato de handoff

Worker: implementar R1–R2 (client) e R3–R4 (rules), provar RED/GREEN, rodar verificação local e parar. Não atualizar tasks.md; não commitar.
