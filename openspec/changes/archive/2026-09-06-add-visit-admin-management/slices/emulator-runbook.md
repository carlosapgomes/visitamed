# Runbook de verificação em emulador (compartilhado pelos slices 002–005)

Referência operacional única para os cenários de rules e endpoints citados nos slices. Contexto do repo: **não há** wiring de emulador no app client (`src/` não chama `connectAuthEmulator`/`connectFirestoreEmulator`) e **não há** suíte de testes em `functions/`. A verificação é feita por harness externo, sem tocar o código de produção.

## R1 — Verificação de rules (slices 002 e 003)

Ferramenta: `@firebase/rules-unit-testing` (devDependency **apenas para validação**, adicionada no slice-003; usa o SDK client, que É avaliado pelas rules — Admin SDK não serve, pois ignora rules).

Estrutura (criada no slice-003, fora de `src/`):

```
scripts/rules-smoke.mjs   # matriz de allow/deny com asserções; exit != 0 em qualquer divergência
```

Comandos:

```bash
npm install -D @firebase/rules-unit-testing@^3   # slice-003, devDependency
firebase emulators:exec --only firestore "node scripts/rules-smoke.mjs"
```

Padrão do script (contexto-zero):

```js
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const test = await initializeTestEnvironment({ projectId: 'rules-smoke', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
// ctx = test.authenticatedContext(uid) / test.unauthenticatedContext()
// seed com test.withSecurityRulesDisabled(...) para montar visits/members/invites/notes
// cada linha da matriz do slice => assertSucceeds(...) ou assertFails(...)
```

A matriz exata de cenários está em cada slice (002: invites; 003: members/notes). O script cobre TODAS as linhas — uma divergência falha o slice.

## R2 — Verificação de endpoints (slices 004 e 005)

Emuladores necessários: `functions`, `auth`, `firestore` (o functions emulator resolve Auth/Firestore emulados automaticamente dentro do `emulators:exec/start`).

> Nota operacional (descoberta no slice 004): o firebase-tools 15.x se recusa a iniciar `--only auth` se `firebase.json` não tiver o bloco `"emulators": { "auth": { "port": 9099 } }` (erro "Not starting the auth emulator" / "No emulators to start"). Para execuções locais do runbook, adicione esse bloco temporariamente ao `firebase.json` e NÃO o commite — o diff de produção deve conter apenas o que o slice pedir (ex.: rewrites no slice 004). Alternativa: usar um firebase.json local de teste.
>
> Nota operacional adicional: dentro do functions emulator, o firebase-tools faz stub do módulo `firebase-admin` devolvendo funções `bind()`-adas — por isso `admin.firestore.FieldValue` (e `admin.firestore.Timestamp`) fica `undefined` no emulador, e qualquer `admin.firestore.FieldValue.serverTimestamp()` lança TypeError → endpoint responde 500. Isso afeta igualmente endpoints pré-existentes (ex.: `leaveVisitEndpointV2`) e NÃO ocorre em produção. Código novo que precise de serverTimestamp/timestamps deve importar nomeado do subpacote: `import { FieldValue } from 'firebase-admin/firestore';` (semântica idêntica; não refatorar endpoints existentes).

```bash
# terminal 1
firebase emulators:start --only functions,auth,firestore,hosting
```

Passo a passo (contexto-zero):

1. **Seed de dados** — com `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, script/node inline via `firebase-admin` ( inicializado com `initializeApp({ projectId: 'demo-<id>' })` ) gravando em `visits/{id}`, `visits/{id}/members/{uid}`, `visits/{id}/invites/{token}` com os timestamps explícitos do cenário. Admin SDK é permitido aqui porque o objetivo é seed, não teste de rules.
2. **Usuários + tokens** — criar usuários no Auth emulator via REST e guardar o `idToken`:

```bash
curl -s 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake' \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@test.com","password":"123456"}'   # repita para admin@test.com, editor@test.com
TOKEN=$(curl -s 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake' \
  -H 'Content-Type: application/json' -d '{"email":"owner@test.com","password":"123456"}' | jq -r .idToken)
```

3. **Chamadas** — contra o functions emulator (porta 5001, projeto `demo-<id>`):

```bash
curl -s "http://127.0.0.1:5001/demo-<id>/southamerica-east1/<endpoint>" \
  -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{...}'
```

   Observação: em produção as rotas passam por Hosting rewrites (`/api/...`); no emulador, chamar a URL direta da function (mesma semântica de handler). O roteamento de Hosting é provado separadamente (ver R3).

4. **Asserts** — comparar status code + `error`/payload com a matriz do slice; ler docs pós-chamada (seed tooling) para confirmar efeitos (ex.: doc inalterado no `access-revoked`).

### R2.1 — Matriz executada (slice-004, registrar resultados por linha)

Registrar aqui, por execução, request→status/payload de cada linha. Resultado da execução do slice-004 (functions emulator, projeto `demo-visitamed`, readbacks via Admin SDK):

```
removeMemberEndpointV2
 R1 owner->remove viewer         200 {"status":"removed"}  | doc: status=removed, removedAt=SET, updatedAt=SET
 R2 outsider (sem membership)    403 {"error":"forbidden"}
 R2 editor (role!=owner/admin)   403 {"error":"forbidden"}
 R2 admin->owner (alvo owner)    403 {"error":"forbidden"}
 R2 admin->self                  403 {"error":"forbidden"}
 R2 alvo inexistente             404 {"error":"membership-not-found"}
 R2 alvo já removido             404 {"error":"membership-not-found"}
 R2 body inválido {}             400 {"error":"invalid-request"}
 R2 sem targetUserId             400 {"error":"invalid-request"}
 R2 sem token                    401 {"error":"unauthenticated"}
 R2 OPTIONS                      204
updateMemberRoleEndpointV2
 R3 owner editor->viewer         200 {"status":"updated","role":"viewer"} | doc: role=viewer, updatedAt=SET
 R4 outsider                     403 forbidden
 R4 editor (self)                403 forbidden
 R4 admin->owner                 403 forbidden
 R4 admin->self                  403 forbidden
 R4 alvo inexistente             404 membership-not-found
 R4 alvo removido                404 membership-not-found
 R4 role=owner                   400 invalid-request
 R4 role=superadmin              400 invalid-request
 R4 sem role                     400 invalid-request
 R4 sem token                    401 unauthenticated
```

Resultado da execução do slice-005 (functions emulator, projeto `demo-slice005`, readbacks via Admin SDK; invites semeados com `createdAt` explícito; usuários/tokens no Auth emulator — harness temporário, não commitado):

```
acceptInviteEndpointV2
 R1 removido + convite novo (createdAt>removedAt, role editor)   200 {"status":"accepted","visitId":"v-r1"}      | doc: status=active, role=editor, removedAt=AUSENTE, updatedAt=SET, sem displayName (token sem name)
 R2 removido + convite antigo (createdAt<=removedAt)             200 {"status":"access-revoked","visitId":"v-r2"} | doc: inalterado (status=removed, removedAt mantido)
 R3 membro ativo                                                 200 {"status":"already-member","visitId":"v-r3"}    | doc: inalterado
 R4 token name " Ana Silva "                                    200 {"status":"accepted","visitId":"v-r4"}      | doc: displayName="Ana Silva" (trim aplicado)
 R4 token sem claim name                                         200 {"status":"accepted","visitId":"v-r4"}      | doc: SEM campo displayName
 R4 claim name 120 chars                                         200 {"status":"accepted","visitId":"v-r4"}      | doc: displayName com 100 chars (truncado)
 R5 campo visitId divergente do caminho                          200 {"status":"invite-not-found"}                        | convite tratado como não encontrado (sem visitId)
 R6 convite role:'admin' (novo membro)                           200 {"status":"accepted","visitId":"v-r6"}      | doc: role=admin (sem invalid-invite-role)
 R6 convite role:'admin' reativando removido                    200 {"status":"accepted","visitId":"v-r6b"}     | doc: role=admin, status=active, removedAt=AUSENTE
```

### R3.1 — Roteamento (ambos os rewrites)

Provar o roteamento de Hosting para TODAS as rotas novas (não só a primeira):

```bash
curl -s http://127.0.0.1:5000/api/visits/members/remove -X POST -H 'Content-Type: application/json' -d '{}'
curl -s http://127.0.0.1:5000/api/visits/members/role   -X POST -H 'Content-Type: application/json' -d '{}'
# esperado em ambas: resposta da function (401 unauthenticated) — NÃO o index.html do PWA
```

Registro slice-004: ambas responderam `401 {"error":"unauthenticated"}` da function (não SPA).

## R3 — Roteamento de Hosting (slice 004)

```bash
# com emuladores de functions+hosting ativos:
curl -s http://127.0.0.1:5000/api/visits/members/remove -X POST -H 'Content-Type: application/json' -d '{}'
# esperado: resposta da function (401 unauthenticated) — NÃO o index.html do PWA
```

> Nota operacional (slice-004): firebase-tools 15.x se recusa a iniciar `--only auth` sem `emulators.auth.port` em firebase.json — adicione temporariamente `{"emulators": {"auth": {"port": 9099}}}` localmente e NÃO commite. Além disso, o stub de firebase-admin do functions emulator (funções bound perdem statics) torna `admin.firestore.FieldValue` indefinido no emulador — em código novo use `import { FieldValue } from 'firebase-admin/firestore'` (endpoints legados não afetados em produção).

## Fallback declarado

Se o ambiente não tiver Firebase CLI/emuladores disponíveis, o worker NÃO inventa alternativa: registra o bloqueio no relatório do slice e escala (as linhas de matriz não verificadas ficam pendentes explicitamente). Inspeção estática sozinha não fecha os cenários de rules/endpoints.
