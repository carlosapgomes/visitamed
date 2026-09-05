# Slice 003 — Rules de members para administração por admin

## Objetivo

Nas regras do Firestore: admin ativo pode listar todos os membros da visita e alterar papéis (com guards de integridade), admin ganha direitos de edição de notas, e as escritas de members são endurecidas contra abuso por escrita direta (owner intocável, removido não reativável por escrita direta, identidade preservada, `delete` fechado). Nenhum código client muda neste slice.

## Contexto necessário

- `firestore.rules` completo: helpers `isActiveMember`/`isOwner`/`canEditVisit`; bloco `match /visits/{visitId}/members/{memberUserId}` (regra atual `allow update, delete: if isOwner(...)` **sem guard de alvo** — permite ao owner corromper o próprio membership); collection group `/{documentPath=**}/members/{memberUserId}`
- Helper `isAdmin` criado no slice 002 (se ainda não existir, criá-lo aqui)
- `src/services/sync/sync-service.ts` — hardening do push reafirma o membership owner (`doc(firestore,'visits',id,'members',userId)`): a nova regra de update PRECISA continuar permitindo essa escrita invariante-preservante do owner sobre si mesmo
- Design.md → D5 (regras separadas por operação; `create` sem branch admin; `delete: if false`) e D2 (owner intocável inclui escritas diretas)
- Runbook `slices/emulator-runbook.md` (R1) — matriz executável via `@firebase/rules-unit-testing` (devDependency adicionada NESTE slice, só para validação; `scripts/rules-smoke.mjs` fora de `src/`)

## Requisitos verificáveis

- **R1** — `canEditVisit` aceita `role == 'admin'` (além de owner/editor) ⇒ admin cria/edita/apaga notas.
- **R2** — `list` em `visits/{visitId}/members/{memberUserId}`: `isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin(visitId, request.auth.uid))`. Admin consulta a subcoleção sem filtros; membro comum continua precisando filtrar pelo próprio `userId` (query atual do sync segue autorizada).
- **R3** — `update` em members, com branches separadas e excludentes:
  - (a) **Owner auto-reafirmação**: `isOwner(visitId, uid) && memberUserId == uid && request.resource.data.role == 'owner' && request.resource.data.status == 'active' && identidade preservada`;
  - (b) **Gerência de outros**: `(isOwner || isAdmin) && memberUserId != uid && get(alvo).data.role != 'owner' && get(alvo).data.status == 'active' && request.resource.data.role in ['admin','editor','viewer'] && request.resource.data.status == resource.data.status && identidade preservada` — ou seja: alvo owner intocável, alvo removido não pode ser reativado por escrita direta, `status` não muda via rules (remoção é via endpoint), papel destino na whitelist;
  - `identidade preservada` = `request.resource.data.id == resource.data.id && request.resource.data.visitId == visitId && request.resource.data.userId == memberUserId`.
- **R4** — `create` em members: **apenas as branches existentes** (bootstrap do owner) — SEM branch admin. A branch de bootstrap é preservada semanticamente (`userId == visit.userId`, self, `role=='owner'`, `status=='active'`, doc inexistente).
- **R5** — `delete` em members: `allow delete: if false` para clientes (docs precisam sobreviver com `removedAt` para a regra do convite-novo; limpeza real é só via `recursiveDelete` do Admin SDK).
- **R6** — Collection group `/{documentPath=**}/members/{memberUserId}` permanece somente próprio membership (sem mudança).

## Matriz requisito -> arquivo -> teste/check

| Requisito | Arquivo(s) esperado(s) | Teste/check |
| --- | --- | --- |
| R1 | `firestore.rules` | `firebase emulators:exec --only firestore "node scripts/rules-smoke.mjs"`: admin escreve nota → permitido |
| R2 | `firestore.rules` | idem: admin lista subcoleção sem filtro → ok; editor sem filtro → negado; editor com `where(userId==uid)` → ok; `npx vitest run src/services/sync` sem quebra |
| R3 | `firestore.rules` | idem: admin muda papel de editor→admin → ok; alvo owner → negado (inclusive pelo próprio owner!); alvo==requester → negado; papel `'owner'` no payload → negado; alvo `removed` → negado (reativação); mudando `status` → negado; mudando `userId`/`id` → negado; owner reafirmando-se (role owner/active, identidade preservada) → ok |
| R4 | `firestore.rules` | idem: bootstrap do owner original → ok; admin criando member de terceiro → negado; `npx vitest run src/services/sync` (bootstrap no push segue funcionando) |
| R5 | `firestore.rules` | idem: qualquer cliente tentando delete de member → negado |
| R6 | `firestore.rules` | Inspeção: bloco inalterado |

## Escopo e expected blast radius

```yaml
expected_files:
  - firestore.rules
  - scripts/rules-smoke.mjs          # novo, fora de src/ (harness do runbook R1)
  - package.json                     # devDependency @firebase/rules-unit-testing (só validação)
allowed_incidental_files:
  - package-lock.json                # efeito colateral do npm install -D
out_of_scope:
  - qualquer arquivo em src/ (nenhum código client)
  - collection group de members
  - rules de invites (slice 002) e de notes além de canEditVisit
  - endpoints functions (slice 004)
```

Escalar se: a fórmula OR do `list` for rejeitada pelo engine de query do emulador (documentar o erro exato e escalar — pode exigir repensar D5, ex.: endpoint dedicado de listagem); se a branch (a) do update conflitar com algum push do sync (verificar `processVisitMemberSyncItem`).

## Plano de testes do slice

### RED (matriz do runbook R1 contra as rules ATUAIS)

- Admin ativo tenta: (a) listar subcoleção sem filtro, (b) atualizar papel de outro membro, (c) escrever nota → `PERMISSION_DENIED` em todos — prova de que o comportamento novo não existe.
- Abuso atual provado: owner alterando/deletando o próprio member doc → **permitido** hoje (falha de integridade) — o cenário negado da matriz R3/R5 falha no sentido inverso.

### GREEN (pós-mudança)

- Mesma matriz executada verde: todos os allows e todas as negações conforme a tabela acima; exit 0 do `rules-smoke.mjs`.

## Verificação do slice

- `firebase emulators:exec --only firestore "node scripts/rules-smoke.mjs"` — exit 0 com a matriz completa (allows + negações)
- `npx vitest run src/services/sync src/services/db` — exit 0 (pull/hidratação, bootstrap e hardening do sync intactos)
- `git diff firestore.rules` revisado: collection group e validações de notes sem alteração semântica
- Sem o Firebase CLI no ambiente: registrar bloqueio e escalar (inspeção estática sozinha não fecha R1–R5)

## Critérios de aceitação

- [ ] R1–R6 demonstrados pela matriz executável
- [ ] Integridades novas provadas: owner intocável, removido não reativável por escrita direta, identidade preservada, `delete` fechado
- [ ] Comportamentos legados preservados (bootstrap do owner, auto-reafirmação no sync, query por userId, notes de editor)

## Contrato de handoff

Worker: editar `firestore.rules` + criar o harness do runbook, provar RED/GREEN, rodar verificação e parar. Não atualizar tasks.md; não commitar.
