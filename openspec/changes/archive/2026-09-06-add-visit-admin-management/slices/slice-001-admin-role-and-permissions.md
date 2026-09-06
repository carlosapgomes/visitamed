# Slice 001 — Papel `admin` no modelo e permissões client

## Objetivo

O tipo de papel passa a incluir `admin` e as funções puras de permissão passam a conceder ao admin os poderes de gerência (membros, convites) e de edição de notas. Nenhuma UI/infra muda; é a base de tipos usada por todos os slices seguintes.

## Contexto necessário

- `src/models/visit-member.ts` — `VisitRole = 'owner' | 'editor' | 'viewer'`, `createVisitMember`, `isActiveMember`
- `src/services/auth/visit-permissions.ts` — `canManageMembers`, `canManageInvites` (hoje owner-only), `canEditNote`, `canDeleteNote` (owner|editor)
- Testes: `src/models/visit-member.test.ts`, `src/services/auth/visit-permissions.test.ts`
- Restrição do projeto: TypeScript strict, sem novas dependências, AGENTS.md na raiz

## Requisitos verificáveis

- **R1** — `VisitRole` aceita `'admin'`; `createVisitMember(visitId, userId, 'admin')` produz membership com `role: 'admin'`, `status: 'active'`.
- **R2** — `canManageMembers`: `true` para owner ativo e admin ativo; `false` para editor/viewer ativos e para admin `removed`.
- **R3** — `canManageInvites`: mesmas regras de R2.
- **R4** — `canEditNote` e `canDeleteNote`: `true` para admin ativo (além de owner/editor); `false` para admin removido.
- **R5** — `getVisitAccessState` e `canDuplicateVisit` permanecem inalterados (regressão).

Observação honesta de TDD: R1 é mudança **só de tipos** (apagados em runtime) — não há RED possível para o modelo; o teste novo de `createVisitMember` documenta a regressão e pode passar de imediato. O RED real está em R2–R4 (comportamento).

## Matriz requisito -> arquivo -> teste/check

| Requisito | Arquivo(s) esperado(s) | Teste/check |
| --- | --- | --- |
| R1 | `src/models/visit-member.ts`, `src/models/visit-member.test.ts` | `npx vitest run src/models/visit-member.test.ts` |
| R2–R3 | `src/services/auth/visit-permissions.ts`, `visit-permissions.test.ts` | `npx vitest run src/services/auth/visit-permissions.test.ts` |
| R4 | `src/services/auth/visit-permissions.ts`, `visit-permissions.test.ts` | idem |
| R5 | `visit-permissions.test.ts` (casos existentes) | idem (nenhum caso existente pode falhar) |

## Escopo e expected blast radius

```yaml
expected_files:
  - src/models/visit-member.ts
  - src/models/visit-member.test.ts
  - src/services/auth/visit-permissions.ts
  - src/services/auth/visit-permissions.test.ts
allowed_incidental_files: []
out_of_scope:
  - firestore.rules (slice 003)
  - visit-invite.ts / InviteRole (slice 002)
  - qualquer view ou service
```

Escalar em vez de ampliar se: precisar alterar helpers de rules, Dexie, ou o contrato de `VisitMember` além do union type.

## Plano de testes do slice

### RED

- Comando: `npx vitest run src/services/auth/visit-permissions.test.ts`
- Falha esperada: novos casos `canManageMembers(admin) === true`, `canManageInvites(admin) === true`, `canEditNote(admin) === true`, `canDeleteNote(admin) === true` falham porque as funções retornam `false` para admin (admin não existe ainda como caso tratado).

### GREEN

- Comando: `npx vitest run src/services/auth/visit-permissions.test.ts src/models/visit-member.test.ts`
- Resultado esperado: exit 0 após incluir `'admin'` em `VisitRole` e nas 4 funções.

## Verificação do slice

- `npx vitest run src/models src/services/auth` — exit 0 (sem regressões)
- `npx eslint src/models/visit-member.ts src/services/auth/visit-permissions.ts --max-warnings 0` — exit 0
- `npx tsc --noEmit` (via `npx tsc -p tsconfig.json --noEmit`) — exit 0 (strict)

## Critérios de aceitação

- [ ] R1–R5 demonstrados pelos testes acima
- [ ] Nenhum teste existente quebrado
- [ ] Blast radius respeitado (4 arquivos)

## Contrato de handoff

Worker com contexto fresco: implementar R1–R4, provar RED/GREEN conforme acima, rodar a verificação local e parar. Não atualizar tasks.md; não commitar.
