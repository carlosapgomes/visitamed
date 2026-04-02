# HANDOFF + PROMPT — S12B (Core tags-first sem `ward` obrigatório)

## Contexto atual
- S12A concluído: UI já está tags-first (sem campo Ala/Setor visível) + header da visita com nome fixo do app.
- Ainda existe ponte técnica no frontend (`ward = primeira tag`) para satisfazer contrato legado.
- Objetivo agora é remover a **obrigatoriedade** de `ward` no core de nota e nas rules.

## Objetivo do slice
Consolidar o core em tags-first:
1) `CreateNoteInput`/validação/salvamento sem `ward` obrigatório,
2) remover ponte técnica da `new-note-view`,
3) ajustar rules de notas para não exigir `ward`.

## Escopo (micro)

### 1) Notes service sem `ward` obrigatório
Arquivo: `src/services/db/notes-service.ts`

Implementar:
- `CreateNoteInput` sem campo `ward`.
- `validateNoteInput(...)` sem checagem de `ward`.
- `saveNote(...)` não exigir/preencher `ward` via input.
- `updateNote(...)` sem suporte a update de `ward`.
- Remover lógica de uso/sugestão de ward ligada ao fluxo de criação/edição (apenas o que estiver diretamente acoplado a save/update/validate).

### 2) New note view sem ponte de `ward`
Arquivo: `src/views/new-note-view.ts`

Implementar:
- remover preenchimento transitório `ward = tags[0]` no `handleSave`.
- enviar input de nota sem `ward`.
- manter UX S12A (tags-first) intacta.

### 3) Rules sem `ward` obrigatório em notas
Arquivo: `firestore.rules`

Ajustar validações de `/users/{userId}/notes/{noteId}`:
- remover requisito `data.ward is string` em create.
- remover validações de tamanho para `ward` em create/update.
- manter demais validações (bed, note, date, ids, etc.).

### 4) Testes mínimos
Arquivos:
- `src/services/db/notes-service.test.ts`
- (somente se necessário) testes afetados por assinatura de `CreateNoteInput`

Ajustar para o novo contrato sem `ward` obrigatório.

## Fora de escopo
- Remoção total de todos os legados `ward-*` (stats/settings/sync e testes amplos) — isso é S12C.
- Refatoração ampla fora do fluxo de nota core.

## Critérios de aceite
- criação/edição de nota funciona sem campo `ward`.
- `CreateNoteInput` não exige mais `ward`.
- `validateNoteInput` não depende de `ward`.
- rules de notas não exigem `ward`.
- validações verdes:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

---

## Prompt pronto para colar (nova conversa / subagente)

```markdown
Você está no projeto WardFlow.

Implemente o slice **S12B - Core tags-first sem `ward` obrigatório** com diff mínimo.

Antes de codar, leia:
1) `AGENTS.md`
2) `docs/collab-slices-roadmap.md`
3) `docs/collab-slice12a-tags-first-ui-header-handoff-prompt.md`
4) `docs/collab-slice12b-core-tags-first-no-ward-required-handoff-prompt.md`
5) `src/services/db/notes-service.ts`
6) `src/views/new-note-view.ts`
7) `src/services/db/notes-service.test.ts`
8) `firestore.rules`

## Escopo
1. Em `notes-service.ts`:
   - remover `ward` de `CreateNoteInput`
   - remover obrigatoriedade de `ward` na validação
   - ajustar `saveNote`/`updateNote` para não depender de `ward`
2. Em `new-note-view.ts`:
   - remover ponte `ward = primeira tag`
   - salvar/editar nota sem `ward`
3. Em `firestore.rules`:
   - remover obrigatoriedade/validação de `ward` em notas de `/users/{userId}/notes/{noteId}`
4. Ajustar testes necessários do notes-service para o novo contrato.

## Restrições
- NÃO fazer limpeza ampla de `ward-*` (fica S12C).
- NÃO alterar UI além do necessário para remover a ponte técnica.
- Diff pequeno e focado.

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
