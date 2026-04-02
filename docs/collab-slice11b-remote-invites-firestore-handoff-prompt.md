# HANDOFF + PROMPT — S11B (Fonte remota de convites em Firestore)

## Contexto atual
- S1–S10 concluídos.
- S11A concluído: endpoint backend autenticado baseline (`/api/invites/accept`) já existe, sem lógica real de aceite.
- Hoje, `visit-invites-service` ainda usa Dexie local para criar/listar/revogar convite.
- Para produção, convites precisam ter **fonte de verdade remota**.

## Objetivo do slice
Mover **create/list/revoke de convites** para Firestore (`/visits/{visitId}/invites/{inviteId}`), mantendo slice pequeno e sem trocar ainda o fluxo de aceite por token (isso fica para S11C/S11D).

## Escopo (micro)

### 1) `visit-invites-service` com operações remotas
Arquivo principal: `src/services/db/visit-invites-service.ts`

Implementar remoto para:
- `createVisitInviteForVisit(...)`
- `listActiveVisitInvites(visitId)`
- `revokeVisitInvite(inviteId)`

Regras esperadas:
1. Usar Firestore Web SDK (`getFirebaseFirestore`, `doc`, `collection`, `getDoc/getDocs`, `setDoc`, `updateDoc`, `query`, etc.).
2. Persistir em `/visits/{visitId}/invites/{inviteId}`.
3. Mapear timestamps Firestore ↔ `Date` no model `VisitInvite`.
4. Falhar com erro claro se Firestore não estiver configurado.
5. **Sem fallback local como fonte de verdade** para essas 3 operações.

### 2) Guard de permissão owner no cliente (fail-fast)
Ainda no `visit-invites-service.ts`:
- Antes de create/revoke, validar membership local atual (`getCurrentUserVisitMember`) + `canManageInvites`.
- Se não puder gerenciar convite, lançar erro de permissão amigável.

> Observação: rules remotas continuam sendo a proteção final. Esse guard é só UX/fail-fast.

### 3) Compatibilidade de escopo
- **Não** migrar ainda `acceptVisitInviteByToken` para backend (S11C/S11D).
- **Não** alterar UI/rotas.
- **Não** implementar hash/rate-limit/auditoria (S11E).

### 4) Testes (TDD seletivo)
Arquivo alvo: `src/services/db/visit-invites-service.test.ts`

Atualizar testes de create/list/revoke para novo comportamento remoto:
- mock de Firestore SDK
- cenário de sucesso
- cenário sem permissão (owner-only)
- cenário Firestore indisponível
- list apenas convites ativos

Manter testes de `acceptVisitInviteByToken` como estão (ainda fluxo transitório local neste slice).

## Fora de escopo
- Endpoint de aceite real por token.
- Alterações em `invite-accept-view`.
- Realtime de invites.
- Refatoração ampla em sync.

## Critérios de aceite
- create/list/revoke usam Firestore remoto.
- owner-only validado no cliente (fail-fast) + rules continuam válidas.
- sem alteração funcional no fluxo de aceite por token neste slice.
- `npm run typecheck`, `npm run lint`, `npm test` verdes.

---

## Prompt pronto para colar (nova conversa / subagente)

```markdown
Você está no projeto WardFlow.

Implemente o slice **S11B - Fonte remota de convites em Firestore (create/list/revoke)** com diff mínimo.

Antes de codar, leia:
1) `AGENTS.md`
2) `docs/collab-slices-roadmap.md`
3) `docs/collab-slice11a-invite-accept-endpoint-baseline-handoff-prompt.md`
4) `docs/collab-slice11b-remote-invites-firestore-handoff-prompt.md`
5) `src/services/db/visit-invites-service.ts`
6) `src/services/db/visit-invites-service.test.ts`
7) `src/services/auth/firebase.ts`
8) `src/services/db/visit-members-service.ts`
9) `src/services/auth/visit-permissions.ts`

## Escopo
1. Migrar para Firestore remoto as operações:
   - `createVisitInviteForVisit`
   - `listActiveVisitInvites`
   - `revokeVisitInvite`
2. Persistir convites em `/visits/{visitId}/invites/{inviteId}`.
3. Fazer mapeamento de timestamp Firestore <-> Date.
4. Adicionar guard fail-fast de owner para create/revoke usando membership local + `canManageInvites`.
5. Não alterar `acceptVisitInviteByToken` (continua transitório neste slice).
6. Atualizar testes de create/list/revoke para o novo comportamento remoto.

## Restrições
- NÃO mexer em UI/rotas.
- NÃO implementar aceite real via endpoint ainda.
- NÃO adicionar fallback legado desnecessário.
- Diff pequeno e focado (micro-slice).

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
