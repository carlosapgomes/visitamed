## Why

O projeto tem um único projeto Firebase (`visitamed-36570`, produção). Sem ambiente de teste, o smoke de funcionalidades colaborativas (tasks 8.3/9.2 do change `add-visit-admin-management`) precisa ser feito direto em produção. Um projeto de staging já foi criado via CLI (`visitamed-staging`, app web `1:470063296321:web:b062b25d95e58ab5a13bc0`) e o alias `staging` já está em `.firebaserc`; falta o client saber para qual projeto apontar em cada build.

## What Changes

- `src/config/env.ts`: config do Firebase passa a ser resolvida de variáveis de ambiente Vite (`import.meta.env.VITE_FIREBASE_*`) com **fallback para os valores atuais de produção** (builds existentes não mudam de comportamento).
- `isFirebaseConfigured()` passa a verificar a presença real das variáveis (deixa de ser `return true`).
- Novo arquivo `.env.staging` (commitado — config web Firebase não é segredo, mesma classe da config já commitada) com a config do projeto `visitamed-staging` obtida via `firebase apps:sdkconfig`.
- Novo script `build:staging` no `package.json` (`vite build --mode staging`).
- Documento `docs/deploy.md` com o runbook de deploy (produção e staging) e os passos manuais pendentes de console (Blaze, provedor Google).

## Capabilities

### New Capabilities

(nenhuma — mudança de tooling/config de deploy, sem comportamento de produto a especificar; `skip_specs: true`.)

### Modified Capabilities

(nenhuma.)

## Impact

- `src/config/env.ts` (resolução por env + validação real), `.env.staging` (novo), `package.json` (script), `docs/deploy.md` (novo).
- Builds de produção: inalterados (fallback = valores atuais). Build de staging: `npm run build:staging`.
- Deploys: `firebase deploy` (default/produção) e `firebase deploy -P staging` — rules, indexes, hosting disponíveis de imediato; **functions exige Blaze ativado no projeto staging** (ação manual de console, documentada).
- Sem mudança em rules, functions, tests ou views.
