# Slice 005 — Re-entrada de removido + `displayName` no aceite

## Objetivo

O `acceptInviteEndpointV2` passa a reativar memberships removidos quando o convite usado foi criado **após** a remoção (com o papel do novo convite), e passa a capturar o `displayName` do perfil no aceite e na reativação. Convites antigos continuam negados (`access-revoked`).

## Contexto necessário

- `functions/src/index.ts` — `acceptInviteEndpointV2` (linha ~231): busca convite por `tokenHash`, valida expiração/revogação, transação que cria `members/{uid}`; estado atual para membro `removed`: retorna `access-revoked`; hoje o endpoint **prefere o campo `visitId` do payload do convite** ao `visitId` do caminho do doc (`functions/src/index.ts:164-170`) — inverter essa precedência faz parte deste slice
- Estrutura do invite: `createdAt` (timestamp — server-anchored a partir do slice 002, que exige `createdAt == request.time` no create), `role`; membership: `removedAt` (serverTimestamp dos endpoints), `status`, `role`
- Design.md → D6 (comparação confiável + coerência de caminho), D7 (`displayName` do claim `name`, trim, ≤100)
- Runbook `slices/emulator-runbook.md` (R2) — verificação executável dos cenários
- `src/models/visit-member.ts` — campo opcional `displayName?: string` será adicionado aqui (client) para espelhar; a gravação é feita pelo endpoint

## Requisitos verificáveis

- **R1 — Reativação**: membership existe com `status:'removed'` **e** `invite.createdAt > member.removedAt` ⇒ mesma transação passa o doc para `status:'active'`, `role = invite.role`, remove `removedAt`, atualiza `updatedAt` e `displayName`; resposta de sucesso (mesmo formato do aceite normal).
- **R2 — Convite antigo**: membership removido **e** `invite.createdAt <= member.removedAt` ⇒ mantém `access-revoked` (código e resposta atuais inalterados) e não altera o doc.
- **R3 — Idempotência preservada**: membership `active` ⇒ resposta `already-member` atual, sem mudanças no doc.
- **R4 — displayName**: em qualquer aceite (novo ou reativação), grava `displayName` = claim `name` do token, trim, vazio→ausente, máx. 100 chars; ausência do claim ⇒ campo não é gravado (nunca string vazia).
- **R5 — Coerência de caminho**: o endpoint passa a usar o `visitId` do **caminho** do doc de convite; se o campo `visitId` gravado divergir do caminho, o convite é tratado como não encontrado (não confiar no campo).

## Matriz requisito -> arquivo -> teste/check

| Requisito | Arquivo(s) esperado(s) | Teste/check |
| --- | --- | --- |
| R1 | `functions/src/index.ts` | `cd functions && npm run build` + emulador: seed (membro removido `removedAt=T1`; convite `createdAt=T2>T1`) → aceite reativa com papel do convite |
| R2 | `functions/src/index.ts` | Emulador: seed (`createdAt=T0<T1`) → `access-revoked`, doc inalterado (verificar com read pós-chamada) |
| R3 | `functions/src/index.ts` | Emulador: membro ativo → `already-member`, doc inalterado |
| R4 | `functions/src/index.ts` | Emulador: token com `name:" Ana Silva "` → doc grava `"Ana Silva"`; token sem `name` → doc sem `displayName` |
| R5 | `functions/src/index.ts` | Emulador: convite com campo `visitId` divergente do caminho → tratado como não encontrado |

Execução: runbook R2 (`slices/emulator-runbook.md`) — seed de docs com timestamps explícitos via Admin SDK contra o Firestore emulator; usuários/tokens via Auth emulator.

## Escopo e expected blast radius

```yaml
expected_files:
  - functions/src/index.ts
  - src/models/visit-member.ts            # apenas o campo opcional displayName + doc JSDoc
allowed_incidental_files:
  - src/models/visit-member.test.ts       # caso de documentação do campo, se aplicável
out_of_scope:
  - endpoints do slice 004
  - firestore.rules
  - invite-accept-view.ts / estados de UI (slice 008)
  - convites: formato do doc de invite inalterado
```

Escalar se: a comparação `createdAt` exigir mudar o formato/gravação de invites (ex.: novo campo serverTimestamp), pois afeta slice 002 e o fluxo de convites existente.

## Plano de testes do slice

### RED

- Não há suíte automatizada em functions. RED efetivo = runbook R2 contra o build atual: cenário R1 retorna `access-revoked` (comportamento atual) — prova de que a reativação não existe.

### GREEN

- Mesmos cenários do emulador (R1–R5) com resultados da matriz, via runbook R2.
- `cd functions && npm run build` — exit 0.
- `npx tsc -p tsconfig.json --noEmit` na raiz — exit 0 (campo novo no modelo).

## Verificação do slice

- Matriz do runbook R2 registrada (R1–R5)
- `npx vitest run src/models src/views/invite-accept-view.test.ts` — exit 0 (client sem regressão; view ainda não usa o campo)
- `git diff functions/src/index.ts`: apenas `acceptInviteEndpointV2` (e tipos auxiliares) alterados

## Critérios de aceitação

- [ ] R1–R5 demonstrados (runbook R2)
- [ ] Códigos de resposta existentes (`already-member`, `access-revoked`, expirado, revogado) preservados
- [ ] Apenas os 2 arquivos do blast radius

## Contrato de handoff

Worker: alterar `acceptInviteEndpointV2` + campo opcional no modelo, provar RED/GREEN pelo emulador, rodar verificação e parar. Não atualizar tasks.md; não commitar.
