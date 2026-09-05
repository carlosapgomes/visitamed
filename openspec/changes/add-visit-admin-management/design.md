## Context

Estado atual (verificado no código): papéis `owner | editor | viewer` em `src/models/visit-member.ts`; owner único atrelado a `visit.userId` e ao doc `members/{uid}` com `role:'owner'`, criado só no bootstrap da visita. Privilégios client em `src/services/auth/visit-permissions.ts` (owner-only para gerência); ACL em `firestore.rules` (helpers `isActiveMember`/`isOwner`/`canEditVisit`; `list` de members só para o próprio membership; `update, delete: isOwner` sem guard de alvo; invites owner-only com `write` amplo). Cloud Functions (`functions/src/index.ts`) expõem endpoints autenticados via Bearer idToken (`acceptInviteEndpointV2`, `leaveVisitEndpointV2`, `deleteVisitEndpointV2`, região `southamerica-east1`, CORS, Admin SDK) — **rotas publicadas via Hosting rewrites em `firebase.json`, um por endpoint**. `removeVisitMemberAsOwner` em `visit-members-service.ts` é local-only (Dexie), sem sync e sem UI. Sync de membership é pull-only via collectionGroup por `userId` (conversor `convertFirestoreMemberToLocal`; tipo `FirestoreMemberData` com papéis `owner|editor|viewer`); realtime escuta apenas `notes`; o push de visita reafirma o membership owner (hardening). Convites: criados client-side direto no Firestore com `createdAt` do relógio do cliente, token com hash SHA-256, papéis `editor|viewer`. Testes: vitest com mocks de `dexie-db`/services; functions sem suíte de testes (validação via `tsc` + emulador, runbook `slices/emulator-runbook.md`). Sem custom claims; sem novos índices necessários (subcoleção `visits/{id}/members` não exige).

## Goals / Non-Goals

**Goals:**
- Delegar administração: owner fixo + N admins com poderes de gerência de participantes e convites.
- Enforcement server-side imediato das mudanças de privilégio (endpoints + rules).
- Listagem de participantes funcional e usável (nome de exibição com fallback).
- Re-entrada de removido somente via convite criado após a remoção, com timestamps confiáveis.
- Slices verticais pequenos, TDD proporcional, sem novas dependências de runtime.

**Non-Goals:**
- Transferência de ownership ou owner "sair da visita".
- Edição fina de papéis editor↔viewer na UI (o endpoint é genérico; a UI expõe só promover a admin / rebaixar a editor).
- Propagação em tempo real de papel/remoção para o device do alvo (já é limitação atual; vale no servidor e no próximo pull).
- Custom claims, mudança de schema Dexie, novos índices.
- Permitir que owner regular saia via leave (comportamento atual mantido).

## Decisions

### D1 — Papel `admin` hierárquico (não flag booleana)
`VisitRole = 'owner' | 'admin' | 'editor' | 'viewer'`. Alternativa: campo `isAdmin` separado — descartada por duplicar estado e complicar guards. Hierarquia casa com os helpers existentes e mantém um único campo de papel. Convites: `InviteRole = 'admin' | 'editor' | 'viewer'` (owner continua proibido em convite).

### D2 — Owner único e fixo como invariante
Owner nasce no bootstrap e nenhuma operação do change o altera — incluindo escritas diretas no Firestore (o que elimina o problema "último owner"). A regra atual `update, delete: isOwner` em members permite ao owner corromper o próprio membership; as novas rules fecham isso (D5). Transferência de owner exigiria transação dedicada e UI extra — fora de escopo.

### D3 — Semântica de poderes do admin
Admin pode: listar members da visita; remover/alterar papel de qualquer membro ativo **exceto owner e a si mesmo**; criar/revogar convites, inclusive papel `admin`; editar/excluir notas; sair da visita (leave, hoje restrito a editor/viewer na UI — slice-007 inclui admin). Admin NÃO pode: excluir visita para todos (owner-only), alterar o owner. Dois admins podem gerenciar um ao outro (sem zona de proteção entre admins) — simples e suficiente.

### D4 — Mudanças de membership via endpoints, não via fila de sync
Novos endpoints `POST /api/visits/members/remove` e `POST /api/visits/members/role` (padrão `leaveVisitEndpointV2`: Bearer idToken, validações, códigos de erro JSON) **com rewrites correspondentes em `firebase.json`** (sem eles as rotas caem no fallback SPA `** -> /index.html`). O service client chama o endpoint, grava o resultado no cache Dexie e re-lista. Alternativa (escrever via fila `visit-member` respeitando rules) — descartada: remoção via fila não dá retorno de erro estruturado ao admin. Endpoints usam Admin SDK (ignoram rules), por isso as validações de privilégio vivem no endpoint; rules seguem como segunda camada para escritas diretas.

### D5 — Rules: fórmula OR para list; escritas de members restritas e invariantes
`allow list` em `visits/{visitId}/members` passa a: próprio membership (`resource.data.userId == uid`) **OU** requester é owner/admin ativo (`get()` no próprio membership — condição independente de resource, avaliada uma vez por query). Client admin consulta a subcoleção sem filtro; membro comum mantém comportamento atual. `canEditVisit` inclui `admin`.

Escritas de members são endurecidas, não apenas liberadas (rules são OR — regras amplas anulam validações específicas):
- **`create`: SEM branch admin.** Membros nascem somente via bootstrap do owner (branch existente) ou aceite de convite (endpoint, Admin SDK). Criar membership direto concederia acesso sem convite e conflitaria com a regra de re-entrada (D6).
- **`update`:** (a) owner pode reafirmar o **próprio** membership apenas de forma invariante-preservante (`role=='owner'`, `status=='active'` — o push de hardening do sync-service depende disso); (b) owner/admin alteram o papel de **outro** membro apenas se o alvo estiver `active`, não for owner nem o próprio requester, `role` destino ∈ `{admin, editor, viewer}`, e campos de identidade (`id`, `visitId`, `userId`) forem preservados. Nenhuma branch client transforma membership removido em ativo (re-entrada só via endpoint/D6).
- **`delete`: `if false`** para clientes. Docs removidos precisam sobreviver (com `removedAt`) para a regra do convite-novo; a limpeza real acontece só no `recursiveDelete` da exclusão da visita (Admin SDK).
- Owner intocável: nenhum caminho client altera ou apaga o doc do owner (a única escrita sobre ele é a auto-reafirmação de (a)).

Invites: regras **separadas por operação** (`read` / `create` / `update`), nunca `write` amplo, para a validação não ser anulada por OR: `create` exige `role ∈ {admin, editor, viewer}`, `createdByUserId == request.auth.uid`, `visitId == visitId` do caminho e **`createdAt == request.time`** (ancoragem server-side, ver D6); `update` mantém `role` imutável pós-criação (revogação altera `revokedAt`/`updatedAt`).

### D6 — Re-entrada: comparar `createdAt` do convite com `removedAt` do membership, com timestamps confiáveis
Em `acceptInviteEndpointV2`: se membership existe com `status:'removed'`, permitir reativação apenas se `invite.createdAt > member.removedAt` (convite novo); reativar define `status:'active'`, `role = invite.role`, limpa `removedAt` e atualiza `displayName`. Caso contrário mantém `access-revoked`. Alternativa (bloqueio permanente ou re-admissão manual pelo owner) — descartadas por atrito. Já-ativo continua `already-member` (idempotente).

A comparação só é confiável com ambos os lados server-side: `removedAt` já é `serverTimestamp` gravado por endpoint; `createdAt` hoje vem do relógio do cliente (`createVisitInvite` usa `new Date()`), sujeito a skew e falsificação. Por isso o D5 exige `createdAt == request.time` no `create` de invites (vira server-anchored) e o endpoint passa a confiar no `visitId` do **caminho** do doc, rejeitando convites cujo campo `visitId` divergir do caminho (hoje o campo tem precedência sobre o caminho).

### D7 — `displayName` opcional no membership
Capturado do claim `name` do idToken no aceite (trim, máx. 100 chars, opcional). Campo não indexado ⇒ **sem bump de schema Dexie**. Fallback de UI: uid truncado (ex.: `abc123…`). Membros antigos sem nome continuam funcionando. O pull (`FirestoreMemberData` + `convertFirestoreMemberToLocal`) passa a conhecer `admin` e `displayName` para não perder dados na hidratação (slice-006).

### D8 — Estrutura de slices
8 slices verticais (ver `slices/`), ordem: modelo/permissões → convites (modelo+service+rules) → rules de members → endpoints de gerência (incl. rewrites) → re-entrada+displayName → services client (incl. conversor de pull) → painel de participantes → convites UI + estados de re-aceite. Base client antes de backend antes de UI para cada dependência; cada slice deixa o repo compilável e testável. Verificação de rules/endpoints segue o runbook compartilhado `slices/emulator-runbook.md`.

## Risks / Trade-offs

- [Rules com `OR` entre condição de resource e `get()` podem rejeitar query se a fórmula não for provável] → Padrão documentado pelo Firestore (condição só de request é avaliada uma vez); cenário coberto pela matriz executável do runbook no slice de rules.
- [Endpoint de mudança de papel sem propagação em tempo real: alvo rebaixado mantém UI de admin até o próximo pull] → Privilégio efetivo cai no servidor no ato (endpoints+rules); limitação já existente para remoção, documentada.
- [Listar members expõe uids/displayName a outros admins] → Superfície restrita a owner/admin; dados mínimos (nome+uid+papel), sem e-mail.
- [Escritas diretas client de members/invites anulam guards se as rules forem amplas (`write` genérico; OR entre branches)] → Regras separadas por operação; guards de identidade preservada, alvo ativo, alvo≠owner, alvo≠requester, whitelist de papel; `delete` de members fechado (`if false`); matriz de negação executável no emulador (runbook).
- [Owner podia corromper o próprio membership por escrita direta (regra atual sem guard de alvo)] → Owner só reafirma o próprio doc de forma invariante-preservante (o hardening do sync depende disso); nenhum caminho client demove/apaga o owner.
- [`createdAt` de convite vem do relógio do cliente → comparação de re-entrada falsificável/sensível a skew] → `createdAt == request.time` nas rules de create; endpoint valida coerência entre `visitId` do campo e do caminho.
- [Functions sem suíte de testes] → Validação por `tsc` + harness executável no runbook: rules via `@firebase/rules-unit-testing` (devDependency only, slice-003) e endpoints via Auth emulator + curl; fallback = registrar bloqueio e escalar, sem inventar atalho.
- [Conversor de pull não conhece `admin`/`displayName` → hidratação perde dados] → Ajuste de `FirestoreMemberData`/`convertFirestoreMemberToLocal` no slice-006, com teste de round-trip.

## Migration Plan

1. Deploy de `firestore.rules` (endurece escritas de members/invites; comportamentos legítimos existentes preservados — bootstrap do owner e reafirmação via sync continuam válidos).
2. Deploy das functions **+ rewrites do `firebase.json`** (novos endpoints + mudança no `acceptInvite`; código de erro `access-revoked` preservado). Publicar hosting junto para as rotas novas.
3. Deploy do client (PWA). Rollback: redeploy da versão anterior; nenhum dado precisa migração (campos novos são aditivos e não indexados).
