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

## R3 — Roteamento de Hosting (slice 004)

```bash
# com emuladores de functions+hosting ativos:
curl -s http://127.0.0.1:5000/api/visits/members/remove -X POST -H 'Content-Type: application/json' -d '{}'
# esperado: resposta da function (401 unauthenticated) — NÃO o index.html do PWA
```

## Fallback declarado

Se o ambiente não tiver Firebase CLI/emuladores disponíveis, o worker NÃO inventa alternativa: registra o bloqueio no relatório do slice e escala (as linhas de matriz não verificadas ficam pendentes explicitamente). Inspeção estática sozinha não fecha os cenários de rules/endpoints.
