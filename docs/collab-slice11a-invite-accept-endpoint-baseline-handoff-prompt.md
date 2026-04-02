# HANDOFF + PROMPT — S11A (Backend baseline: endpoint autenticado para aceitar convite)

## Contexto atual
- S1–S10 concluídos.
- Fluxo de aceite de convite por token ainda é local no cliente (não adequado para produção).
- Objetivo deste slice é apenas criar baseline backend autenticado para endpoint de aceite.

## Objetivo do slice
Implementar **infra mínima** de endpoint remoto autenticado para aceite de convite, sem lógica de negócio completa ainda.

## Escopo (micro)

### 1) Setup de Cloud Functions (TypeScript)
Criar estrutura `functions/` mínima com:
- `functions/package.json`
- `functions/tsconfig.json`
- `functions/src/index.ts`

Dependências esperadas (functions):
- `firebase-admin`
- `firebase-functions`
- `typescript` (dev)

### 2) Endpoint HTTP autenticado
Implementar função HTTP (nome sugerido: `acceptInviteEndpoint`) com rota pensada para `POST /api/invites/accept` via Hosting rewrite.

Regras do endpoint:
1. Método obrigatório `POST` (OPTIONS para preflight pode responder 204)
2. Header `Authorization: Bearer <idToken>` obrigatório
3. Verificar ID token com Firebase Admin
4. Body JSON obrigatório com `token: string` não vazio
5. Resposta baseline (sem aceitar convite ainda):
   - `200 { status: 'authenticated', uid, tokenReceived: true }`
6. Erros:
   - `401 unauthenticated`
   - `400 invalid-request`
   - `500 internal-error`

### 3) Firebase config
Atualizar `firebase.json` para incluir:
- bloco `functions` com `source: "functions"`
- rewrite de endpoint API antes do catch-all SPA:
  - `/api/invites/accept` -> function `acceptInviteEndpoint`

### 4) Documentação rápida
Adicionar breve nota em `docs/` (ou no próprio handoff, se preferir) com exemplo de chamada do endpoint (curl/fetch) e formato de resposta.

## Fora de escopo
- Lógica de aceite real (expiração/revogação/membership) — fica S11C.
- Troca do frontend para usar endpoint — fica S11D.
- Hash token/rate-limit/auditoria — fica S11E.

## Critérios de aceite
- Endpoint deployável e autenticado.
- Rejeita request sem auth ou token.
- Aceita request autenticado com token válido e retorna payload baseline.
- `npm run typecheck`, `npm run lint`, `npm test` (root) verdes.

---

## Prompt pronto para colar (nova conversa)

```markdown
Você está no projeto WardFlow.

Implemente o slice **S11A - Backend baseline para endpoint autenticado de aceite de convite** com diff mínimo.

Antes de codar, leia:
1) `AGENTS.md`
2) `docs/collab-slices-roadmap.md`
3) `docs/collab-slice11a-invite-accept-endpoint-baseline-handoff-prompt.md`
4) `firebase.json`
5) `src/views/invite-accept-view.ts`
6) `src/services/db/visit-invites-service.ts`

## Escopo
1. Criar estrutura `functions/` TypeScript mínima (`package.json`, `tsconfig.json`, `src/index.ts`).
2. Implementar função HTTP `acceptInviteEndpoint`:
   - POST only
   - valida Authorization Bearer
   - verifica Firebase ID token (admin)
   - valida body `{ token: string }`
   - responde baseline `200 { status:'authenticated', uid, tokenReceived:true }`
   - erros 400/401/500
3. Atualizar `firebase.json` com bloco `functions` e rewrite `/api/invites/accept` para essa função, mantendo SPA rewrite.
4. Adicionar nota curta de uso do endpoint em `docs/`.

## Restrições
- NÃO implementar aceite real do convite ainda.
- NÃO mexer no frontend de aceite ainda.
- NÃO fazer refatoração ampla.

## Validação obrigatória
Rodar e reportar:
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Entrega
- Arquivos criados/alterados
- Resumo curto do endpoint baseline
- Resultado dos 3 comandos
```
