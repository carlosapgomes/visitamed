## Why

Visitas em modo grupo concentram toda a administração num único owner (o criador). Se o dono precisa delegar a gestão de participantes e convites (ausência, rotatividade de equipe), não há como; também não existe forma de ver quem participa da visita ou remover um participante pela UI. O serviço local `removeVisitMemberAsOwner` existe, mas é órfão (só Dexie, sem sync, sem UI).

## What Changes

- Novo papel `admin` na hierarquia de membros de visita: `owner > admin > editor > viewer` (aditivo ao tipo `VisitRole`).
- Múltiplos admins por visita. Owner permanece **único e fixo** (o criador; intransferível neste change).
- Admin passa a poder: listar participantes, remover participantes (exceto owner e a si mesmo), promover membro a admin / rebaixar admin a editor (exceto owner e a si mesmo), gerenciar convites (criar/revogar, incluindo convites com papel `admin`) e editar notas.
- Owner mantém tudo que admin pode, mais "excluir visita para todos".
- Novos endpoints autenticados em `functions/`: remover membro e alterar papel de membro (padrão dos endpoints existentes, verificação de privilégio server-side).
- `acceptInvite`: membro removido pode voltar **somente** com convite criado **após** a sua remoção (reativação do membership com o papel do novo convite); convite anterior continua negado (`access-revoked`).
- Membership ganha campo opcional `displayName` (capturado do perfil Google no aceite) para exibição na lista de participantes; fallback: uid truncado.
- Firestore rules: `canEditVisit` inclui `admin`; `list` de members liberado para admins da visita; `create`/`update` de members e `read`/`write` de invites liberados para admins (com guards de integridade).
- UI: painel de participantes no dashboard (listar/remover/promover/rebaixar, visível a owner/admin) e opção de papel `admin` no modal de convite.

## Capabilities

### New Capabilities
- `visit-member-administration`: delegação de administração de visita — papéis com admin delegável e multi-admin, gerência de participantes (listar, remover, promover/rebaixar), convites criados por admin (incl. papel admin) e re-entrada de membro removido mediante convite novo.

### Modified Capabilities

(nenhuma — não há capabilities publicadas em `openspec/specs/`; todos os requisitos entram como novos.)

## Impact

- **Models**: `src/models/visit-member.ts` (role `admin`, `displayName?`), `src/models/visit-invite.ts` (`InviteRole` + `admin`).
- **Permissões**: `src/services/auth/visit-permissions.ts` (`canManageMembers`, `canManageInvites`, `canEditNote`, `canDeleteNote` incluem admin).
- **Services**: `src/services/db/visit-members-service.ts` (operação de remoção via endpoint, alteração de papel, listagem remota + cache), `src/services/db/visit-invites-service.ts` (papel admin).
- **Cloud Functions**: `functions/src/index.ts` — 2 endpoints novos + reativação no `acceptInviteEndpointV2`.
- **Rules**: `firestore.rules` (helpers `isAdmin`, members — com endurecimento de escritas: owner intocável, `delete` fechado, identidade preservada —, invites separados por operação, `canEditVisit`).
- **Config**: `firebase.json` — rewrites de Hosting para os 2 endpoints novos (sem eles as rotas caem no fallback SPA).
- **Views**: `src/views/dashboard-view.ts`, `src/views/invite-accept-view.ts`.
- **Sync**: `src/services/sync/sync-service.ts` — `FirestoreMemberData.role` + `'admin'` e conversor copiando `displayName` (round-trip da hidratação).
- **DevDependency de validação**: `@firebase/rules-unit-testing` (apenas para o harness de rules do slice-003; sem impacto de runtime).
- **Sem** custom claims, **sem** novos índices (listagem usa subcoleção `visits/{id}/members`, que não exige índice), **sem** mudança de schema Dexie (`displayName` não é indexado).
- Deploy pós-change (operador): `firestore.rules`, functions **e hosting** (rewrites).
