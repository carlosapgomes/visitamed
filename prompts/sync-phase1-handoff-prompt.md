# HANDOFF + PROMPT — Fase 1 (fila de sync conectada ao CRUD local)

## Estado atual (evidência no código)

### Persistência local está implementada
- `src/services/db/notes-service.ts`
  - `saveNote()` salva em Dexie: `await db.notes.add(note)`
  - `updateNote()` atualiza local
  - `deleteNote()`/`deleteNotes()` removem local
- `src/services/db/dexie-db.ts`
  - tabelas `notes`, `settings`, `syncQueue` existem

### Sync está parcial/placeholder
- `src/services/sync/sync-service.ts`
  - `queueNoteForSync()` existe e grava em `db.syncQueue`
  - `syncNow()` existe
  - `processSyncItem()` é placeholder com `console.log` (sem Firestore real)

### Lacuna principal desta fase
- O CRUD de notas **não chama** `queueNoteForSync()` hoje.

---

## Objetivo da fase 1
Conectar operações locais de notas à fila de sincronização, sem implementar Firestore ainda.

**Meta:** toda criação/edição/exclusão local deve gerar item em `syncQueue` e refletir `syncStatus` localmente.

---

## Escopo (somente esta fase)

### Implementar
1. Enfileirar em `syncQueue` após:
   - criar nota
   - editar nota
   - excluir nota(s)
2. Atualizar `syncStatus` local para `pending` quando houver alteração local.
3. Corrigir consistência de `pendingCount` no `sync-service` (não forçar 0 sem recalcular).

### Não implementar agora
- Escrita no Firestore
- Pull remoto
- Sync automático por evento/intervalo
- Refatorações amplas

---

## Arquivos-alvo
- `src/services/db/notes-service.ts`
- `src/services/sync/sync-service.ts`
- (se necessário) `src/models/note.ts` (apenas uso do tipo existente)

---

## Diretrizes de implementação (mínimo diff)

1. Em `notes-service.ts`:
   - importar `queueNoteForSync` de `sync-service`.
   - `saveNote()`:
     - manter lógica atual;
     - após salvar, chamar `queueNoteForSync('create', note)`.
   - `updateNote()`:
     - obter snapshot da nota atualizada (ou compor payload com id+campos atualizados);
     - chamar `queueNoteForSync('update', noteAtualizada)`.
   - `deleteNote()`/`deleteNotes()`:
     - antes de excluir, capturar dados mínimos para payload (ideal: nota completa se disponível);
     - chamar `queueNoteForSync('delete', note)` por item.
2. Ajustar `syncStatus` para `pending` em create/update.
3. Em `sync-service.ts`:
   - em `syncNow()`, ao final, recalcular `pendingCount` usando `db.syncQueue.count()` (não fixar 0 hardcoded).

---

## Critérios de aceite
- Criar nota aumenta `syncQueue` em 1.
- Editar nota aumenta `syncQueue` em 1.
- Excluir nota(s) aumenta `syncQueue` proporcionalmente.
- `pendingCount` reporta o valor real da fila.
- App continua funcionando (dashboard, nova nota, edição, exclusão).
- `npm run typecheck && npm run lint && npm test` passam.

---

## Prompt pronto para colar (nova conversa)

```markdown
Você está no projeto WardFlow.

Implemente a Fase 1 de sincronização com menor diff possível, sem alterar lógica de negócio principal.

Objetivo:
- Conectar CRUD local de notas à fila de sync (`syncQueue`).

Contexto técnico atual:
- Persistência local já existe em `src/services/db/notes-service.ts`.
- Fila existe em `src/services/sync/sync-service.ts` com `queueNoteForSync()`.
- `processSyncItem()` ainda é placeholder (não implementar Firestore nesta fase).

Tarefas:
1. Em `notes-service.ts`, enfileirar operações:
   - create -> `queueNoteForSync('create', note)`
   - update -> `queueNoteForSync('update', noteAtualizada)`
   - delete -> `queueNoteForSync('delete', note)`
2. Garantir `syncStatus: 'pending'` para mudanças locais (create/update).
3. Em `sync-service.ts`, corrigir `pendingCount` para refletir contagem real após `syncNow()`.

Restrições:
- Não implementar Firestore nesta fase.
- Não refatorar arquitetura.
- Não mexer em UI além do necessário.

Entrega esperada:
- Lista de arquivos alterados.
- Diffs principais.
- Validação com `typecheck/lint/test`.
```
