## 1. Config client por ambiente

- [x] 1.1 Em `src/config/env.ts`: ler `import.meta.env.VITE_FIREBASE_*` (6 variáveis, design D3) com fallback para os literais de produção atuais; `isFirebaseConfigured()` valida apiKey+projectId+appId efetivos; verificar `npm run build` e `npx vitest run src/models src/services/auth` verdes (nenhum teste pode quebrar — fallback preserva valores)
- [x] 1.2 Criar `.env.staging` com a config do projeto `visitamed-staging` (valores reais abaixo, já obtidos via `firebase apps:sdkconfig`): `VITE_FIREBASE_API_KEY=AIzaSyDT5Dzi1MPOqYcozbUpHI17ougv5r8Fi1k`, `VITE_FIREBASE_AUTH_DOMAIN=visitamed-staging.firebaseapp.com`, `VITE_FIREBASE_PROJECT_ID=visitamed-staging`, `VITE_FIREBASE_STORAGE_BUCKET=visitamed-staging.firebasestorage.app`, `VITE_FIREBASE_MESSAGING_SENDER_ID=470063296321`, `VITE_FIREBASE_APP_ID=1:470063296321:web:b062b25d95e58ab5a13bc0`
- [x] 1.3 Em `package.json`: `"build:staging": "vite build --mode staging"`; verificar `npm run build:staging` gera `dist/` cujo bundle contém `visitamed-staging` (rg no dist) e `npm run build` contém `visitamed-36570`

## 2. Runbook e fechamento

- [x] 2.1 Criar `docs/deploy.md`: pré-requisitos de console no staging (Blaze; Authentication → Google → habilitar + e-mails de teste), comandos de deploy por ambiente (`firebase deploy -P staging --only firestore:rules,firestore:indexes,hosting`; functions após Blaze; produção sem `-P`), e apontar o smoke humano (2 contas) do change `add-visit-admin-management`
- [x] 2.2 Gate: `npm test`, `npm run lint`, `npm run build` verdes; commit atômico do change

## Notas

- Change de tooling/config: `skip_specs: true` (sem delta de comportamento de produto).
- Implementação em 1 slice único (arquivos: `src/config/env.ts`, `.env.staging`, `package.json`, `docs/deploy.md`) — sem diretório `slices/`, escopo pequeno e autocontido.
- Infra fora do repo já concluída pelo parent: projeto `visitamed-staging` criado, web app registrado, `.firebaserc` com alias `staging`.
