# HANDOFF + PROMPT — Fase 2 (sync real com Firestore + retry)

## Pré-condição
Esta fase assume Fase 1 concluída: CRUD local já enfileira eventos em `syncQueue`.

---

## Estado atual (evidência no código)

- `src/services/sync/sync-service.ts`
  - `syncNow()` percorre `db.syncQueue`
  - `handleSyncError()` já incrementa `retryCount`
  - `processSyncItem()` ainda é placeholder (`console.log`)
- `src/services/auth/firebase.ts`
  - Firestore já inicializa via `getFirebaseFirestore()`
- Busca no projeto não encontrou uso de escrita Firestore (`setDoc/updateDoc/deleteDoc` ausentes)

---

## Objetivo da fase 2
Implementar sincronização real da fila para Firestore.

**Meta:** itens em `syncQueue` são processados e escritos em nuvem com tratamento de erro/retry.

---

## Escopo

### Implementar
1. Implementar `processSyncItem(item)` em `sync-service.ts`.
2. Operações remotas:
   - `create` -> grava nota
   - `update` -> atualiza nota
   - `delete` -> remove nota
3. Atualizar estado local da nota após sucesso (`syncStatus: 'synced'`, `syncedAt`).
4. Em falha:
   - manter item na fila
   - incrementar retry (já existente)
   - marcar nota como `failed` ao exceder limite (quando aplicável)

### Não implementar nesta fase
- Pull remoto (Firestore -> local)
- Resolução avançada de conflito
- Reestruturação de dados global

---

## Arquivos-alvo
- `src/services/sync/sync-service.ts`
- (opcional mínimo) `src/services/db/notes-service.ts` somente se necessário para helpers

---

## Estratégia recomendada (mínimo diff)

1. Em `sync-service.ts`, importar do Firestore:
   - `doc`, `setDoc`, `updateDoc`, `deleteDoc`
2. Parsear `item.payload` com segurança (`JSON.parse`).
3. Path recomendado por usuário:
   - `users/{userId}/notes/{noteId}`
4. Regras por operação:
   - `create`: `setDoc(ref, notePayload)`
   - `update`: `updateDoc(ref, campos)` com fallback para `setDoc(..., { merge: true })` se necessário
   - `delete`: `deleteDoc(ref)`
5. Após sucesso remoto:
   - se nota ainda existir localmente, `db.notes.update(noteId, { syncStatus: 'synced', syncedAt: new Date() })`
6. Em erro fatal (excedeu retries):
   - manter item com erro registrado (já existe)
   - marcar nota local `syncStatus: 'failed'` quando existir
7. Garantir que `pendingCount` reflita `db.syncQueue.count()` ao final.

---

## Critérios de aceite
- Fila sincroniza para Firestore quando `syncNow()` é chamada.
- Itens bem-sucedidos saem da fila.
- Itens com erro permanecem com retryCount/error.
- `syncStatus` local transita para `synced` em sucesso.
- `npm run typecheck && npm run lint && npm test` passam.

---

## Prompt pronto para colar (nova conversa)

```markdown
Você está no projeto WardFlow.

Implemente a Fase 2 de sincronização: tornar `syncNow()` funcional com Firestore, com menor diff possível.

Contexto:
- `syncQueue` já existe e é processada em `src/services/sync/sync-service.ts`.
- `processSyncItem()` hoje é placeholder.
- Firestore já inicializa em `src/services/auth/firebase.ts`.

Objetivo:
- Implementar escrita real no Firestore para operações create/update/delete vindas da fila.

Requisitos:
1. Implementar `processSyncItem(item)` com `setDoc/updateDoc/deleteDoc`.
2. Usar path por usuário (`users/{userId}/notes/{noteId}`), extraindo userId do payload.
3. Em sucesso, remover item da fila e marcar nota local como `synced` com `syncedAt`.
4. Em falha, manter retry/error existentes e marcar nota como `failed` se exceder tentativas.
5. Manter `pendingCount` consistente com a fila real.

Restrições:
- Sem pull remoto nesta fase.
- Sem refatoração arquitetural ampla.
- Sem mudança de UI desnecessária.

Entrega:
- Arquivos alterados
- Diffs principais
- Evidência de validação (`typecheck/lint/test`)
```
