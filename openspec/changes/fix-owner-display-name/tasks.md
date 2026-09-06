## 1. Carimbo na criação do membership owner

- [x] 1.1 RED: em `src/services/db/visit-members-service.test.ts`, novo caso — `createOwnerVisitMember` com `getAuthState` retornando `user.displayName = " Ana Silva "` produz membership com `displayName: "Ana Silva"`; sem nome no perfil ⇒ campo ausente (nunca string vazia). Rodar focado e falhar (campo inexistente na função)
- [x] 1.2 GREEN: em `createOwnerVisitMember` (`src/services/db/visit-members-service.ts`), carimbar `displayName` a partir de `getAuthState().user?.displayName` (trim; omitir se vazio/ausente). Mesmo comando focado passa
- [x] 1.3 Confirmar que o push de membership (`processVisitMemberSyncItem` em `src/services/sync/sync-service.ts`) serializa `displayName` quando presente no objeto local; se não serializar, ajustar o mapeamento (e teste no sync-service.test.ts)

## 2. Self-heal na listagem de participantes

- [x] 2.1 RED: casos novos em `visit-members-service.test.ts` para `fetchVisitMembersFromRemote`: (a) membership do usuário atual remoto sem `displayName` + perfil com nome ⇒ `updateDoc` chamado no doc remoto com `{ displayName, updatedAt }` + cache local atualizado + lista retornada com o nome; (b) membership já com nome ⇒ `updateDoc` NÃO chamado; (c) `updateDoc` rejeitado (rules) ⇒ função não propaga erro e retorna a lista com o dado remoto
- [x] 2.2 GREEN: implementar o heal em `fetchVisitMembersFromRemote` (só para o membership do usuário atual; `updateDoc` em `visits/{visitId}/members/{uid}`; try/catch engolindo falha com console.warn; atualizar Dexie e a lista retornada quando o update succeed). Mesmo comando focado passa

## 3. Gate

- [x] 3.1 `npx vitest run src/services/db src/services/sync` + `npm run lint` + `npm run build` verdes; commit atômico do change

## Notas

- Bug fix pequeno: `skip_specs: true`; comportamento pertence ao requisito "Nome de exibição do participante" do change `add-visit-admin-management` (ainda não arquivado).
- Regras/functions inalteradas: owner pode auto-atualizar o próprio doc (branch de auto-reafirmação avalia o estado futuro mesclado); não-owner é negado e a falha é engolida.
- Blast radius: `src/services/db/visit-members-service.ts` + `.test.ts`; `src/services/sync/sync-service.ts`/`.test.ts` só se o 1.3 exigir.
