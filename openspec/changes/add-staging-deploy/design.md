## Context

Projeto Firebase de produção: `visitamed-36570` (config web hardcoded em `src/config/env.ts`; `isFirebaseConfigured()` retorna `true` incondicionalmente). Client chama endpoints por **URL relativa** (`fetch('/api/...')`) — roteados pelo Hosting de qualquer projeto, sem mudança de código. Projeto de staging `visitamed-staging` já criado via CLI com web app `1:470063296321:web:b062b25d95e58ab5a13bc0`; config obtida via `apps:sdkconfig`. `.firebaserc` já tem aliases `default` e `staging`. Vite suporta modos (`--mode staging` lê `.env.staging`); variáveis expostas ao client precisam do prefixo `VITE_`.

## Goals / Non-Goals

**Goals:**
- `npm run build` (produção) continua gerando exatamente o mesmo app de hoje (fallback = config atual).
- `npm run build:staging` gera o app apontando para `visitamed-staging`.
- Runbook de deploy claro para os dois ambientes, incluindo os passos manuais de console ainda pendentes.

**Non-Goals:**
- CI/CD automático (GitHub Actions) — futuro.
- Ambientes adicionais (dev/pr-preview).
- Qualquer mudança em rules, functions ou fluxo de produto.
- Variáveis de ambiente nas Cloud Functions (não há config externa nelas hoje).

## Decisions

### D1 — Env vars Vite com fallback à config de produção
`import.meta.env.VITE_FIREBASE_API_KEY` etc.; ausente ⇒ usa o literal de produção atual (comportamento preservado; zero risco para o deploy existente). Alternativa (sem fallback, falhar se ausente) — descartada: quebraria builds locais/CI existentes sem ganho. `isFirebaseConfigured()` valida presença de apiKey+projectId+appId efetivos.

### D2 — `.env.staging` commitado
Config web do Firebase é identificador público de client (já se commita hoje hardcoded em `env.ts`); staging isolado por projeto. Alternativa (`.env.staging` em gitignore com valores no CI) — desnecessária enquanto não houver CI.

### D3 — Variáveis mínimas
Somente as 6 usadas pelo client: `VITE_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`. `measurementId`/analytics: fora (não usado em código hoje — confirmado: `initializeApp` recebe só o objeto `config.firebase` sem measurement).

## Risks / Trade-offs

- [Build de produção sem `.env` em máquina nova usa fallback] → Comportamento idêntico ao atual (hardcoded); nenhum risco novo.
- [Confusão de deploy no projeto errado] → Runbook em `docs/deploy.md` com `firebase use <alias>` explícito por passo; `-P` sempre informado nos comandos de staging.
- [Auth Google ainda não habilitado no staging (console)] → Documentado como pré-requisito manual; smoke só após esse passo.

## Migration Plan

1. Implementar env config + `.env.staging` + script + `docs/deploy.md`.
2. Operador (console, uma vez): ativar Blaze no `visitamed-staging`; Authentication → Google → habilitar + adicionar e-mails de teste.
3. Deploys: `firebase deploy -P staging --only firestore:rules,firestore:indexes,hosting` (imediatamente) e `--only functions` após Blaze.
4. Rollback: redeploy do build de produção; nenhum dado migrado.

## Open Questions

(nenhum.)
