# Slice 004 — Endpoints de gerência de membros (remove + role)

## Objetivo

Dois endpoints autenticados no Cloud Functions permitem ao owner/admin remover um membro e alterar o papel de um membro, com validação de privilégio server-side (Admin SDK) e códigos de erro estruturados. É a base de backend dos serviços client do slice 006.

## Contexto necessário

- `functions/src/index.ts` (715 linhas): padrão a copiar é `leaveVisitEndpointV2` (linha ~338) — CORS/OPTIONS, `authenticateRequest` (Bearer idToken), validação de body, leitura de `visits/{visitId}/members/{uid}`, códigos de erro JSON, região `southamerica-east1`
- `firebase.json` — Hosting rewrites por endpoint (`/api/invites/accept`, `/api/visits/leave`, `/api/visits/delete`) + fallback `** -> /index.html`: **sem rewrite novo, a rota nova cai no fallback SPA e nunca chega à function**
- Tipos de request/response existentes no topo do arquivo (`LeaveVisitRequest` etc.) — criar pares equivalentes
- Design.md → D4 (endpoints em vez de fila de sync, com rewrites), D3 (semântica de poderes)
- Functions não possuem suíte de testes (`functions/package.json` tem build/serve/deploy, **não tem script de testes**); validação = `tsc` + runbook `slices/emulator-runbook.md` (R2/R3: Auth emulator + curl + roteamento Hosting). Não criar infra de teste além do runbook.

## Requisitos verificáveis

- **R1 — `removeMemberEndpointV2` (`POST /api/visits/members/remove`)**: body `{ visitId, targetUserId }`; sucesso (200) marca o membership do alvo `status:'removed'`, `removedAt`/`updatedAt` serverTimestamp; resposta `{ status: 'removed', visitId, targetUserId }`.
- **R2 — Negações do remove (403 `{error:'forbidden'}` salvo indicado)**: solicitante sem membership ativo; solicitante com papel ≠ owner/admin; alvo == owner; alvo == solicitante; alvo inexistente ou já removido → 404 `{error:'membership-not-found'}`; body inválido → 400 `invalid-request`; sem token → 401.
- **R3 — `updateMemberRoleEndpointV2` (`POST /api/visits/members/role`)**: body `{ visitId, targetUserId, role }` com `role ∈ {admin, editor, viewer}`; sucesso (200) atualiza `role`/`updatedAt` do alvo; resposta `{ status:'updated', visitId, targetUserId, role }`.
- **R4 — Negações do role**: mesmas de R2 e, adicionalmente, `role` fora da whitelist ou `role === 'owner'` → 400 `invalid-request` (alvo owner → 403 `forbidden`).
- **R5 — Roteamento**: `firebase.json` ganha rewrites para `/api/visits/members/remove` → `removeMemberEndpointV2` e `/api/visits/members/role` → `updateMemberRoleEndpointV2`, ambos região `southamerica-east1` (antes do fallback `**`).

## Matriz requisito -> arquivo -> teste/check

| Requisito | Arquivo(s) esperado(s) | Teste/check |
| --- | --- | --- |
| R1–R3 | `functions/src/index.ts` | `cd functions && npm run build` (exit 0) + runbook R2 (curl no emulador): 200 no caminho feliz; cada negação com o código exato |
| R4 | `functions/src/index.ts` | idem: 200 com papel atualizado; negações conforme matriz |
| R5 | `firebase.json` | runbook R3: `curl http://127.0.0.1:5000/api/visits/members/remove` responde da function (401), não do SPA |

Roteiro curl (emulador): seguir o runbook R2 (`slices/emulator-runbook.md`) — usuários/tokens via Auth emulator, seed de `visits/members` via Admin SDK contra o Firestore emulator; exercitar a matriz com `-H "Authorization: Bearer <token>"`.

## Escopo e expected blast radius

```yaml
expected_files:
  - functions/src/index.ts
  - firebase.json
allowed_incidental_files: []
out_of_scope:
  - qualquer arquivo em src/ (client entra no slice 006)
  - acceptInviteEndpointV2 (slice 005)
  - leaveVisit/deleteVisit (comportamento existente)
  - firestore.rules (slices 002/003)
```

Escalar se: for preciso alterar `authenticateRequest`, CORS global ou criar helpers de Admin SDK novos fora do padrão existente.

## Plano de testes do slice

### RED

- Não há suíte automatizada em functions (decisão de proporção, design.md Riscos). RED = runbook R2 contra o build atual: rotas `POST /api/visits/members/remove` e `/role` não existem (404 da function/Rewrite cai no SPA) — prova de que não existem.

### GREEN

- `cd functions && npm run build` — exit 0.
- Runbook R2 executando a matriz completa (caminhos felizes + todas as negações) com os códigos esperados; runbook R3 provando o roteamento de Hosting (R5).

## Verificação do slice

- Matriz do runbook R2 registrada (request/response de cada linha) + R3 (roteamento)
- `git diff functions/src/index.ts firebase.json` revisado: nenhum endpoint/rewrite existente alterado
- `npx vitest run src/services/sync` na raiz — exit 0 (client intacto)

## Critérios de aceitação

- [ ] R1–R5 demonstrados pelo runbook (R2 + R3)
- [ ] Endpoints existentes (accept/leave/delete) e rewrites existentes inalterados
- [ ] Apenas `functions/src/index.ts` e `firebase.json` modificados

## Contrato de handoff

Worker: implementar os 2 endpoints copiando o padrão de `leaveVisitEndpointV2`, provar RED (404) e GREEN (matriz), rodar verificação e parar. Não atualizar tasks.md; não commitar.
