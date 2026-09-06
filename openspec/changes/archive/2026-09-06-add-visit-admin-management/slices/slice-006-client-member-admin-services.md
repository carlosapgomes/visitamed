# Slice 006 — Services client de gerência de membros

## Objetivo

O `visit-members-service` passa a oferecer, para owner/admin: listagem de participantes direto do Firestore com cache Dexie, remoção via endpoint do slice 004 e alteração de papel via endpoint — substituindo o fluxo local-only de `removeVisitMemberAsOwner`. Nenhuma view muda ainda.

## Contexto necessário

- `src/services/db/visit-members-service.ts` (completo): `RemoveVisitMemberStatus`, `removeVisitMemberAsOwner` (fluxo local-only a substituir), `listVisitMembers` (cache), `upsertVisitMember`, `getVisitMember`, `requireUserId`
- Padrão de chamada a endpoints no client: `src/services/db/visits-service.ts` → `leaveVisit` (fetch + Bearer idToken + parse de erro JSON) — copiar o mecanismo (URL/region) e o tratamento de erro
- Firestore client: `src/services/sync/firebase.ts` ou equivalente usado pelo sync (`collection`, `getDocs`, `query`) — para a listagem da subcoleção `visits/{visitId}/members`
- `src/services/auth/visit-permissions.ts` → `canManageMembers` (slice 001 já inclui admin)
- `src/services/sync/sync-service.ts` — **`FirestoreMemberData.role` é `'owner' | 'editor' | 'viewer'` (sem `admin`, linha ~1354) e `convertFirestoreMemberToLocal` (~1459) não copia `displayName`**: sem ajuste, o pull de hidratação perderia o papel `admin` (tipo dessincronizado) e o nome; ajuste inclusível neste slice
- Testes e padrão de mocks: `src/services/db/visit-members-service.test.ts` (vi.mock de `dexie-db`, `auth-service`, `visit-permissions`), `src/services/sync/sync-service.test.ts` (para o round-trip do conversor) e mocks de `fetch` usados em `src/services/db/visits-service.test.ts`
- Endpoints (slice 004): `POST /api/visits/members/remove`, `POST /api/visits/members/role`; regras (slice 003) autorizam a listagem do admin

## Requisitos verificáveis

- **R1 — `fetchVisitMembersFromRemote(visitId)`**: consulta `visits/{visitId}/members`, converte docs para `VisitMember` (id canônico `visitId:userId` — doc id remoto é só `userId`, ver `convertFirestoreMemberToLocal` no sync), faz upsert no cache Dexie e retorna a lista. Erros de rede/Firestore propagam (throw) após tentativa.
- **R2 — `removeVisitMemberAsAdmin(visitId, targetUserId)`**: gate client `canManageMembers` (senão `forbidden`); chama endpoint remove; `200` ⇒ grava local `status:'removed'`/`removedAt` e retorna `removed`; mapeia erros do endpoint (`membership-not-found`→`target-not-found`, `forbidden`→`forbidden`) mantendo o tipo `RemoveVisitMemberStatus` e os status `cannot-remove-owner`/`cannot-remove-self` verificados localmente antes da chamada (evita roundtrip inútil).
- **R3 — `updateVisitMemberRole(visitId, targetUserId, newRole)`**: gate `canManageMembers`; nega localmente alvo owner/self; chama endpoint role; `200` ⇒ grava `role`/`updatedAt` local e retorna o member atualizado; erros mapeados analogamente.
- **R4 — Retirada do fluxo local-only**: `removeVisitMemberAsOwner` é removido ou passa a delegar para `removeVisitMemberAsAdmin` (sem chamadores órfãos); `rg 'removeVisitMemberAsOwner' src/` não retorna uso vivo além do próprio service/testes atualizados.
- **R5 — Pull preserva `admin` e `displayName`**: `FirestoreMemberData.role` passa a incluir `'admin'` e `convertFirestoreMemberToLocal` copia `displayName` (quando presente) — hidratação não perde papel nem nome. Sem mudança de comportamento de fila/realtime.

## Matriz requisito -> arquivo -> teste/check

| Requisito | Arquivo(s) esperado(s) | Teste/check |
| --- | --- | --- |
| R1 | `src/services/db/visit-members-service.ts`, `.test.ts` | `npx vitest run src/services/db/visit-members-service.test.ts` (casos: converte id remoto→canônico, upsert no cache, retorna lista, propaga erro) |
| R2 | idem | idem (casos: sem permissão→forbidden; owner/self→negado local; 200→grava removed; 403→forbidden; 404→target-not-found; erro de rede→throw) |
| R3 | idem | idem (casos análogos ao R2 com papel) |
| R4 | idem + `rg` | `rg -n 'removeVisitMemberAsOwner' src/` → apenas definição/testes atualizados (sem chamadores) |
| R5 | `src/services/sync/sync-service.ts`, `src/services/sync/sync-service.test.ts` | `npx vitest run src/services/sync/sync-service.test.ts` (RED→GREEN: round-trip com `role:'admin'` e `displayName` preservados; nenhum caso existente quebra) |

## Escopo e expected blast radius

```yaml
expected_files:
  - src/services/db/visit-members-service.ts
  - src/services/db/visit-members-service.test.ts
  - src/services/sync/sync-service.ts          # FirestoreMemberData + convertFirestoreMemberToLocal (R5)
  - src/services/sync/sync-service.test.ts     # round-trip do conversor
allowed_incidental_files: []
out_of_scope:
  - dashboard-view.ts / qualquer UI (slice 007)
  - fila de sync e realtime (apenas o tipo/conversor do pull mudam)
  - endpoints/rules (slices anteriores)
  - visit-invites-service.ts
```

Escalar se: a chamada ao endpoint exigir novo utilitário de HTTP compartilhado ou alterar `auth-service` para obter o idToken de forma diferente do padrão de `leaveVisit`; se o ajuste do conversor exigir mudar a lógica de fila/merge do pull além do tipo/conversor.

## Plano de testes do slice

### RED

- Comando: `npx vitest run src/services/db/visit-members-service.test.ts src/services/sync/sync-service.test.ts`
- Falha esperada: imports de `fetchVisitMembersFromRemote`/`removeVisitMemberAsAdmin`/`updateVisitMemberRole` inexistentes (undefined) — os casos novos falham por "not a function"; o caso de round-trip do conversor falha porque `role:'admin'`/`displayName` não são mapeados; casos do fluxo antigo que forem removidos são migrados, não apagados às cegas.

### GREEN

- Mesmo comando — exit 0 com os casos da matriz.

## Verificação do slice

- `npx vitest run src/services/db src/services/sync` — exit 0 (sem regressão nos services e no pull)
- `npx eslint src/services/db/visit-members-service.ts src/services/sync/sync-service.ts --max-warnings 0` — exit 0
- `npx tsc -p tsconfig.json --noEmit` — exit 0

## Critérios de aceitação

- [ ] R1–R5 demonstrados pelos testes
- [ ] Tipos `RemoveVisitMemberStatus`/`RemoveVisitMemberResult` preservados (ou evolução documentada em comentário curto)
- [ ] Nenhuma view/import de UI alterada

## Contrato de handoff

Worker: implementar R1–R3 seguindo o padrão de fetch de `leaveVisit`, provar RED/GREEN, rodar verificação e parar. Não atualizar tasks.md; não commitar.
