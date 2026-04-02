# HANDOFF + PROMPT — S14B (Push de visita + membership owner via fila de sync)

## Contexto
- S14A concluído: no login o app agora hidrata memberships ativos + visitas remotas antes do pull de notas.
- Gap restante para multi-dispositivo: criação/duplicação de visita ainda é local-first sem push explícito de `visit` + `owner membership` para a nuvem.
- Hoje há bootstrap best-effort em fluxo de nota, mas isso não cobre bem visitas sem notas e atrasa consistência entre dispositivos.

## Objetivo do slice
Garantir que, ao criar/duplicar visita, a app enfileire e sincronize também:
1) documento da visita (`/visits/{visitId}`)
2) membership do owner (`/visits/{visitId}/members/{uid}`)

usando a **fila de sync** (offline-first), sem depender da criação de notas.

## Escopo (micro)

### 1) Expandir tipos de entidade da fila
Arquivo: `src/models/sync-queue.ts`

- Expandir `SyncQueueItem['entityType']` para incluir:
  - `'visit'`
  - `'visit-member'`

### 2) Enfileirar visit + owner membership nas operações locais
Arquivo: `src/services/db/visits-service.ts`

- Em `createPrivateVisit(...)`:
  - manter transação atual (`visits + visitMembers`)
  - adicionar enqueue na mesma transação para:
    - `create` de `visit`
    - `create` de `visit-member` (owner)
- Em `duplicateVisitAsPrivate(...)`:
  - além do queue de notas já existente, também enfileirar:
    - `create` de `visit`
    - `create` de `visit-member` (owner)
- Preservar comportamento offline e sem refactor amplo.

### 3) Processar novos tipos no sync
Arquivo: `src/services/sync/sync-service.ts`

- Em `processSyncItem(...)`, tratar novos `entityType`:
  - `visit`
  - `visit-member`

Implementação sugerida:
- `visit:create|update` => `setDoc(doc(firestore, 'visits', visitId), payload, { merge: true })`
- `visit:delete` => `deleteDoc(doc(firestore, 'visits', visitId))` (mesmo que não usado agora)
- `visit-member:create|update` => `setDoc(doc(firestore, 'visits', visitId, 'members', userId), payload, { merge: true })`
- `visit-member:delete` => `deleteDoc(doc(firestore, 'visits', visitId, 'members', userId))`

> Observação importante: para `visit-member`, usar `userId` como document id na subcoleção `members`.

### 4) Testes mínimos
Arquivos:
- `src/services/db/visits-service.test.ts`
- (opcional se necessário) `src/services/sync/sync-service.test.ts`

Cobrir no mínimo:
- `createPrivateVisit` enfileira `visit` + `visit-member`
- `duplicateVisitAsPrivate` enfileira `visit` + `visit-member` além das notas
- manter testes existentes verdes

## Fora de escopo
- Guard de logout com pendências (S14C)
- Mudanças de `firestore.rules`
- Refatoração ampla de sync
- Migração de dados legados

## Critérios de aceite
- criação de visita gera itens de fila para `visit` e `visit-member`
- duplicação de visita também gera esses itens
- sync processa novos tipos sem quebrar `note/settings`
- validações verdes:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

---

## Prompt pronto para colar (nova conversa / subagente)

```markdown
Você está no projeto WardFlow.

Implemente o slice **S14B - Push de visita + membership owner via fila de sync** com diff mínimo.

Antes de codar, leia:
1) `AGENTS.md`
2) `docs/collab-slices-roadmap.md`
3) `docs/collab-slice14b-push-visit-owner-membership-sync-queue-handoff-prompt.md`
4) `src/models/sync-queue.ts`
5) `src/services/db/visits-service.ts`
6) `src/services/sync/sync-service.ts`
7) `src/services/db/visits-service.test.ts`

## Escopo obrigatório
1. Expandir `entityType` de sync queue para suportar:
   - `visit`
   - `visit-member`
2. Em `createPrivateVisit`:
   - enfileirar `create` de `visit`
   - enfileirar `create` de `visit-member` owner
3. Em `duplicateVisitAsPrivate`:
   - manter queue de notas
   - adicionar queue de `visit` + `visit-member` owner
4. Em `sync-service`, processar novos tipos no `processSyncItem`:
   - `visit` -> coleção `/visits/{visitId}`
   - `visit-member` -> coleção `/visits/{visitId}/members/{userId}`
5. Adicionar/ajustar testes mínimos em `visits-service.test.ts` (e em `sync-service.test.ts` só se necessário).

## Restrições
- NÃO alterar firestore.rules.
- NÃO refatorar amplo.
- manter diff pequeno e focado.

## Validação obrigatória
Rodar e reportar:
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Entrega
- arquivos alterados
- resumo curto
- resultado dos 3 comandos
```
