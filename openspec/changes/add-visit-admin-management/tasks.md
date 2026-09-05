## 1. Preflight

- [x] 1.1 Confirmar working tree limpa, registrar `BASE_REF` (HEAD atual) e rodar a suíte completa uma única vez como baseline (`npm test`); registrar contagem/pass failures pré-existentes, se houver
- [x] 1.2 Confirmar disponibilidade do harness de verificação (Firebase CLI + emuladores; runbook `slices/emulator-runbook.md`) — sem ele, os cenários de rules/endpoints dos slices 002–005 ficam bloqueados e devem ser escalados, não simulados por inspeção

## 2. Slice 1 — Papel admin no modelo e permissões client (slices/slice-001-admin-role-and-permissions.md)

- [x] 2.1 RED: adicionar testes de `role 'admin'` em `src/models/visit-member.test.ts` e de `canManageMembers`/`canManageInvites`/`canEditNote`/`canDeleteNote` para admin em `src/services/auth/visit-permissions.test.ts`; rodar focado (`npx vitest run src/models/visit-member.test.ts src/services/auth/visit-permissions.test.ts`) e falhar pelo motivo esperado
- [x] 2.2 GREEN: estender `VisitRole` com `'admin'` em `src/models/visit-member.ts` e incluir `'admin'` nas permissões de gerência/edição em `src/services/auth/visit-permissions.ts`; mesmo comando focado passa
- [x] 2.3 Verificação do slice: `npx vitest run src/models src/services/auth` + `npx eslint src/models/visit-member.ts src/services/auth/visit-permissions.ts --max-warnings 0`

## 3. Slice 2 — Convites com papel admin (slices/slice-002-invite-admin-role.md)

- [x] 3.1 RED: testes do papel `admin` em `InviteRole` (`src/models/visit-invite.test.ts`) e aceitação de admin na validação de gerência de convites (`src/services/db/visit-invites-service.test.ts`); rodar focado e falhar pelo motivo esperado
- [x] 3.2 GREEN: adicionar `'admin'` a `InviteRole` em `src/models/visit-invite.ts` e ajustar `src/services/db/visit-invites-service.ts` (validação usa permissões do slice 1); mesmo comando focado passa
- [x] 3.3 Rules de invites **separadas por operação** (nunca `write` amplo): `read` = `isOwner || isAdmin` (helper `isAdmin` novo); `create` valida `role in ['admin','editor','viewer']`, `createdByUserId == uid`, `visitId == visitId` do caminho e `createdAt == request.time` (ancoragem server-side para a re-entrada); `update` mantém `role` imutável; verificação pela matriz R1 do runbook (`scripts/rules-smoke.mjs`)
- [x] 3.4 Verificação do slice: `npx vitest run src/models src/services/db/visit-invites-service.test.ts` + lint dos arquivos alterados

## 4. Slice 3 — Rules de members para admins (slices/slice-003-rules-member-administration.md)

- [x] 4.1 Em `firestore.rules`: `canEditVisit` inclui `role == 'admin'`; `list` de `members` com fórmula OR (próprio membership OU owner/admin ativo); `update` com branches separadas — owner auto-reafirma o próprio doc apenas de forma invariante-preservante (push do sync depende disso); owner/admin alteram papel de outro membro só se alvo ativo, ≠ owner, ≠ requester, papel na whitelist e identidade (`id`/`visitId`/`userId`) preservada; `create` mantém apenas o bootstrap do owner (sem branch admin); `delete` passa a `if false` para clientes
- [x] 4.2 Verificação do slice: `firebase emulators:exec --only firestore "node scripts/rules-smoke.mjs"` verde (RED: abusos atuais permitidos, ex. owner altera próprio doc; GREEN: matriz completa de allows/negações) + `npx vitest run src/services/sync src/services/db` sem quebra (bootstrap, hardening e pull intactos)

## 5. Slice 4 — Endpoints de gerência de membros (slices/slice-004-member-management-endpoints.md)

- [x] 5.1 Em `functions/src/index.ts`: criar `removeMemberEndpointV2` (`POST /api/visits/members/remove`) e `updateMemberRoleEndpointV2` (`POST /api/visits/members/role`) no padrão `leaveVisitEndpointV2` (Bearer idToken, CORS, região `southamerica-east1`); privilégio = owner/admin ativo; negar alvo owner, alvo == solicitante, papel destino fora de `{admin, editor, viewer}`; códigos de erro estruturados (`forbidden`, `membership-not-found`, `invalid-request`…)
- [x] 5.2 Em `firebase.json`: adicionar rewrites `/api/visits/members/remove` e `/api/visits/members/role` para as functions novas (região `southamerica-east1`), antes do fallback `**`
- [x] 5.3 Verificação do slice: `cd functions && npm run build` sem erros; runbook R2 (matriz de sucesso/negações por curl no emulador) + R3 (roteamento Hosting responde da function, não do SPA)

## 6. Slice 5 — Re-entrada de removido + displayName (slices/slice-005-invite-readmission-display-name.md)

- [x] 6.1 Em `functions/src/index.ts` (`acceptInviteEndpointV2`): membership `removed` é reativado somente se `invite.createdAt > member.removedAt` (definir `status:'active'`, `role = invite.role`, limpar `removedAt`, atualizar `updatedAt`/`displayName`); caso contrário manter `access-revoked`; capturar `displayName` do claim `name` do token (trim, ≤100 chars) no aceite e na reativação; confiar no `visitId` do **caminho** do convite e rejeitar divergência com o campo gravado
- [x] 6.2 Verificação do slice: `cd functions && npm run build`; runbook R2 com os cenários: (a) removido + convite antigo → `access-revoked`; (b) removido + convite novo → reativado com papel do convite; (c) membro ativo → `already-member`; (d) `visitId` divergente → não encontrado

## 7. Slice 6 — Services client de gerência (slices/slice-006-client-member-admin-services.md)

- [x] 7.1 RED: testes em `src/services/db/visit-members-service.test.ts` para (a) listagem remota de members da visita com cache Dexie, (b) remoção via endpoint com atualização local, (c) alteração de papel via endpoint com atualização local, incluindo caminhos de erro (`forbidden`, `target-not-found`); rodar focado e falhar
- [x] 7.2 GREEN: implementar em `src/services/db/visit-members-service.ts`: `fetchVisitMembersFromRemote(visitId)` (query na subcoleção + upsert local), `removeVisitMemberAsAdmin(visitId, targetUserId)` e `updateVisitMemberRole(visitId, targetUserId, newRole)` chamando os endpoints do slice 4 (substituindo o fluxo local-only de `removeVisitMemberAsOwner`, mantendo os status types existentes); mesmo comando focado passa
- [x] 7.3 Em `src/services/sync/sync-service.ts`: `FirestoreMemberData.role` inclui `'admin'` e `convertFirestoreMemberToLocal` copia `displayName` (round-trip da hidratação); teste de round-trip em `sync-service.test.ts` verde
- [x] 7.4 Verificação do slice: `npx vitest run src/services/db src/services/sync` + `npx eslint src/services/db/visit-members-service.ts src/services/sync/sync-service.ts --max-warnings 0`

## 8. Slice 7 — Painel de participantes (slices/slice-007-participants-panel-ui.md)

- [x] 8.1 Em `src/views/dashboard-view.ts`: painel/modal de participantes visível a owner/admin (usa `canManageMembers`) listando membros com papel em badge (dono/admin/editor/viewer), nome (`displayName` com fallback uid truncado) e ações por linha: remover (exceto owner/self) e promover a admin / rebaixar a editor (exceto owner/self); estados de loading/erro/confirmção simples, mobile-first com design tokens; sem tocar em `components/`
- [x] 8.2 Em `src/views/dashboard-view.ts`: "Sair da visita" passa a aparecer para `admin` ativo (hoje só editor/viewer); endpoint leave já aceita
- [ ] 8.3 Verificação do slice: PARCIAL — parte automatizada verde (vitest views+auth, eslint, npm run build); PENDENTE smoke humano no `npm run dev` (sem browser no ambiente de execução): owner e admin veem painel, editor não vê, admin consegue sair da visita

## 9. Slice 8 — Convites UI admin + re-aceite (slices/slice-008-invite-admin-ui-readmission.md)

- [x] 9.1 Em `src/views/dashboard-view.ts`: modal de convite oferece papel `admin` como opção (além de editor/viewer) para quem pode gerenciar convites; em `src/views/invite-accept-view.ts`: estados de re-aceite coerentes (convite novo após remoção → `accepted`; convite antigo → `access-revoked` existente)
- [ ] 9.2 Verificação do slice: PARCIAL — parte automatizada verde (vitest views+db, eslint, npm run build); PENDENTE smoke humano: criar convite admin, aceitar com segunda conta, rebaixar/remover e re-aceitar via convite novo

## 10. Gate final

- [x] 10.1 Suíte completa e quality gate: `npm test`, `npm run lint`, `npm run build`, `cd functions && npm run build` — todos verdes
- [x] 10.2 Revisão consolidada do diff completo vs `BASE_REF` contra os requisitos da spec (`specs/visit-member-administration/spec.md`); sem regressões nos fluxos existentes (criar visita, convidar, aceitar, sair, excluir visita)
- [x] 10.3 Checklist de deploy para o operador: `firebase deploy --only firestore:rules,functions,hosting` e publicação do PWA (observar Migration Plan do design.md — rewrites do hosting são parte do deploy)
