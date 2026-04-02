# HANDOFF + PROMPT — S11D (Frontend: aceite via endpoint remoto)

## Contexto atual
- S11A: endpoint autenticado `/api/invites/accept` criado.
- S11B: create/list/revoke de convites já usam Firestore remoto.
- S11C: endpoint já processa aceite real por token com statuses de negócio.
- **Pendente:** frontend ainda usa fluxo local (Dexie) em `acceptVisitInviteByToken(...)`.

## Objetivo do slice
Trocar o aceite de convite no frontend para usar o endpoint remoto (`/api/invites/accept`), preservando os mesmos statuses que a UI já conhece.

## Escopo (micro)

### 1) Migrar `acceptVisitInviteByToken` para HTTP endpoint
Arquivo: `src/services/db/visit-invites-service.ts`

Implementar:
1. obter usuário autenticado (`getAuthState`) e Firebase ID token (`user.getIdToken()`)
2. `fetch('/api/invites/accept', { method:'POST', headers, body })`
3. enviar `{ token }` no body JSON
4. mapear resposta JSON para `AcceptInviteResult` com statuses:
   - `accepted`
   - `already-member`
   - `invite-not-found`
   - `invite-expired`
   - `invite-revoked`
   - `access-revoked`
5. manter assinatura pública da função (sem quebrar `invite-accept-view`)

### 2) Tratar erros de protocolo
- `401` -> erro de usuário não autenticado
- `400/405/500` -> erro genérico de processamento remoto
- status de negócio inválido -> erro de contrato

### 3) Remover dependência local para aceite
- Não usar `findInviteByToken`/Dexie dentro de `acceptVisitInviteByToken`.
- Não adicionar fallback local (sem compat desnecessária).

### 4) Testes (TDD seletivo)
Arquivo: `src/services/db/visit-invites-service.test.ts`

Atualizar testes de `acceptVisitInviteByToken` para mock de `fetch` + token auth:
- sucesso `accepted`
- cada status de negócio
- 401
- erro HTTP 500
- payload inválido

> Não precisa alterar testes de create/list/revoke remotos além do necessário para estabilidade.

## Fora de escopo
- Mudanças em UI/rotas (`invite-accept-view` deve continuar igual).
- Hardening de segurança (hash/rate-limit/auditoria) — S11E.
- Refatoração ampla.

## Critérios de aceite
- `invite-accept-view` funciona sem mudança estrutural.
- aceite usa endpoint remoto autenticado.
- sem fallback local no aceite.
- validações verdes:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

---

## Prompt pronto para colar (nova conversa / subagente)

```markdown
Você está no projeto WardFlow.

Implemente o slice **S11D - Frontend troca aceite local por endpoint remoto** com diff mínimo.

Antes de codar, leia:
1) `AGENTS.md`
2) `docs/collab-slices-roadmap.md`
3) `docs/collab-slice11c-invite-accept-backend-transaction-handoff-prompt.md`
4) `docs/collab-slice11d-frontend-accept-via-endpoint-handoff-prompt.md`
5) `src/services/db/visit-invites-service.ts`
6) `src/services/db/visit-invites-service.test.ts`
7) `src/views/invite-accept-view.ts`
8) `src/services/auth/auth-service.ts`

## Escopo
1. Migrar `acceptVisitInviteByToken(token)` para chamar `POST /api/invites/accept` com Bearer token Firebase.
2. Preservar contrato de retorno (`AcceptInviteResult`) e statuses usados pela UI.
3. Tratar erros HTTP (401/400/405/500) com mensagens consistentes.
4. Remover dependência de Dexie no fluxo de aceite (sem fallback local).
5. Atualizar testes de `acceptVisitInviteByToken` com mocks de `fetch`.

## Restrições
- NÃO alterar UI/rotas.
- NÃO implementar S11E (hash/rate-limit/auditoria).
- NÃO fazer refatoração ampla.

## Validação obrigatória
Rodar e reportar:
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Entrega
- Arquivos alterados
- Resumo curto do que mudou
- Resultado dos 3 comandos
```
