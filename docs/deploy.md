# Deploy — VisitaMed

Runbook de build e deploy para os dois ambientes: **produção** (`visitamed-36570`) e **staging** (`visitamed-staging`).

O client resolve o projeto Firebase em build time via variáveis Vite `VITE_FIREBASE_*` (fallback = produção, ver `src/config/env.ts`). O backend (rules/indexes/functions) é o mesmo código nos dois projetos; só muda o projeto de destino do deploy.

## Ambientes

| Ambiente  | Projeto Firebase          | Alias (`.firebaserc`) | Build               |
|-----------|---------------------------|-----------------------|---------------------|
| Produção  | `visitamed-36570`         | `default`             | `npm run build`     |
| Staging   | `visitamed-staging`       | `staging`             | `npm run build:staging` |

> ⚠️ Confira sempre o projeto ativo antes de deployar: `firebase use` e `firebase projects:list`.

## Build por ambiente

```bash
# Produção (config hardcoded de fallback em src/config/env.ts)
npm run build

# Staging (lê .env.staging)
npm run build:staging
```

Verificação rápida de que o bundle aponta para o projeto certo:

```bash
rg -l "visitamed-36570" dist/assets   # build de produção
rg -l "visitamed-staging" dist/assets # build de staging
```

## Staging — pré-requisitos manuais de console (pendentes)

> Executar uma vez no Firebase Console do projeto `visitamed-staging`, antes do primeiro deploy com functions e antes do smoke humano.

1. **Plano Blaze (pay-as-you-go)** — necessário para Cloud Functions. `firebase deploy -P staging --only functions` falha sem ele.
2. **Authentication → Sign-in method → Google → Enable** (mesmo provider/IDs de produção).
3. **Adicionar contas de teste no OAuth consent screen** (conta A = owner e conta B = convidado/admin, usadas no smoke colaborativo). A allowlist de contas Google do smoke NÃO é o usuário listado em *Authentication → Users* do Firebase Auth, e sim a lista *Test users* do OAuth consent screen do projeto GCP: **Google Cloud Console** (`console.cloud.google.com`, projeto `visitamed-staging`) → **APIs & Services → OAuth consent screen** (em projetos novos: **Google Auth Platform** → aba **Audience**) → seção **Test users** → adicionar as duas contas Google. Nota: se o consent screen estiver **In production**, não existe allowlist e qualquer conta Google loga; se estiver **Testing**, apenas as contas listadas em *Test users* conseguem logar.

Sem Blaze, rules/indexes/hosting já podem ser deployados; functions ficam para depois do passo 1.

## Deploy por ambiente

### Staging

```bash
# Imediato (sem Blaze): rules + indexes + hosting
firebase deploy -P staging --only firestore:rules,firestore:indexes,hosting

# Após ativar Blaze no projeto staging
firebase deploy -P staging --only functions

# Deploy completo em staging
firebase deploy -P staging
```

### Produção

```bash
# Deploy padrão (alias default = visitamed-36570), sem -P
firebase deploy

# Ou explícito
firebase deploy -P default
```

### Smoke humano pós-deploy (staging)

Validar com **duas contas Google** (owner + convidado) o fluxo colaborativo de administração de visitas pendente do change `add-visit-admin-management` (tasks 8.3 e 9.2): painel de participantes, criar/aceitar convite admin, rebaixar/remover membro e re-aceitar via convite novo.

## Rollback

- Redeploy do build de produção (`npm run build` + `firebase deploy`). Nenhum dado é migrado entre projetos; o staging é isolado.

## Links

- Console produção: https://console.firebase.google.com/project/visitamed-36570
- Console staging: https://console.firebase.google.com/project/visitamed-staging
