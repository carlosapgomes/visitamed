## Why

No smoke do staging foi reportado: no painel de participantes, a linha do dono mostra só o uid, sem nome. Causa raiz: o campo `displayName` só é capturado no aceite de convite (`acceptInviteEndpointV2`), mas o membership do dono nasce no bootstrap da visita (`createOwnerVisitMember` / hardening `bootstrapVisitForOwner`), que nunca passa pelo aceite — logo o doc do dono nunca tem nome.

## What Changes

- **Novas visitas**: `createOwnerVisitMember` (usado por `createPrivateVisit` e `duplicateVisitAsPrivate`) passa a carimbar `displayName` a partir do perfil do usuário autenticado (`getAuthState().user.displayName`, trim, ausente ⇒ omitido).
- **Visitas existentes (self-heal)**: em `fetchVisitMembersFromRemote`, após ler a lista, se o membership do **usuário atual** está sem `displayName` e o perfil tem nome, o client faz `updateDoc` remoto (`{ displayName, updatedAt }`) + atualiza cache e a lista retornada. Rules: owner pode auto-atualizar (branch de auto-reafirmação — `request.resource.data` é o estado futuro mesclado, role/status/identidade intactos); não-owner é negado pelas rules ⇒ falha engolida silenciosamente (não-owners já recebem nome no aceite, então o caso é teórico).
- Regras do Firestore e Cloud Functions: **inalteradas**.

## Capabilities

### New Capabilities

(nenhuma — correção de bug na implementação do comportamento já especificado em `add-visit-admin-management` → capability `visit-member-administration`, requisito "Nome de exibição do participante". `skip_specs: true`; a especificação vive no change ainda não arquivado.)

### Modified Capabilities

(nenhuma.)

## Impact

- `src/services/db/visit-members-service.ts` (carimbo na criação + heal na listagem) e `.test.ts`.
- Verificação de que o push de membership (`processVisitMemberSyncItem`) serializa `displayName` quando presente (deve — o payload vem do objeto local; confirmar e ajustar só se não serializar).
- Nenhuma view muda (a policy já renderiza `displayName` com fallback uid — slice-007).
- Deploy: client; sem deploy de rules/functions.
