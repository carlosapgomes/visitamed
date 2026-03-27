# HANDOFF + PROMPT — Fase 3 (orquestração automática de sync)

## Pré-condição
Esta fase assume Fase 2 concluída: `syncNow()` já sincroniza de fato com Firestore.

---

## Estado atual (evidência no código)

- `src/services/sync/sync-service.ts`
  - possui API manual (`syncNow`, `subscribeToSync`, `getSyncStatus`)
- Não há integração automática encontrada:
  - `syncNow()` não é chamado em `app.ts`, views ou auth flow
  - não há listener `window.online` para disparar sync
- `cleanExpiredNotes()` existe em `src/services/db/dexie-db.ts`, mas não está plugada no boot

---

## Objetivo da fase 3
Adicionar orquestração automática e previsível da sincronização.

**Meta:** criar offline e sincronizar automaticamente quando usuário estiver autenticado e voltar online.

---

## Escopo

### Implementar
1. Inicialização de sync no ciclo de vida da app.
2. Disparar sync quando:
   - auth ficar disponível (usuário logado)
   - evento `online` ocorrer
3. (Opcional recomendado) tentativa periódica leve (ex.: 60s) enquanto autenticado.
4. (Opcional recomendado) chamar `cleanExpiredNotes()` no boot para higiene local.

### Não implementar
- Pull remoto complexo
- Conflito bidirecional avançado
- Refatoração estrutural ampla

---

## Arquivos-alvo
- `src/services/sync/sync-service.ts`
- `src/app.ts`
- (opcional) `src/services/auth/auth-service.ts` apenas se necessário para hook limpo
- `src/services/db/dexie-db.ts` (somente uso de função já existente)

---

## Estratégia recomendada (mínimo diff)

1. Criar em `sync-service.ts` algo como `initializeSync()`:
   - registrar listener `window.addEventListener('online', ...)`
   - expor `cleanupSync()` para evitar leaks
2. Em `app.ts`:
   - após auth/router init, observar `subscribeToAuth` já existente
   - quando `user` estiver definido e `loading === false`, chamar `syncNow()`
3. Guardar proteção de concorrência usando `currentStatus.isSyncing` (já existe).
4. Se adotar timer:
   - usar intervalo conservador
   - iniciar só autenticado
5. Se adotar limpeza de expiradas:
   - executar no boot, sem bloquear inicialização da UI.

---

## Critérios de aceite
- Criou nota offline -> item entra na fila.
- Reabrir app online e autenticado -> sincroniza sem ação manual.
- Alternar offline/online -> evento `online` dispara `syncNow()`.
- Sem regressão de rotas, auth e CRUD local.
- `npm run typecheck && npm run lint && npm test` passam.

---

## Prompt pronto para colar (nova conversa)

```markdown
Você está no projeto WardFlow.

Implemente a Fase 3 de sincronização: orquestração automática com menor diff possível.

Contexto:
- Fase 2 já deixou `syncNow()` funcional com Firestore.
- Hoje a sync é manual e não há gatilho automático por auth/online.

Objetivo:
- Inicializar e disparar sync automaticamente quando fizer sentido.

Tarefas:
1. Adicionar inicialização de sync (listener de `online`) em `sync-service.ts`.
2. Integrar no boot da app (`src/app.ts`) para chamar `syncNow()` quando usuário estiver autenticado.
3. Manter proteção contra concorrência (`isSyncing`).
4. Opcional recomendado: tentativa periódica leve e limpeza de expiradas no boot.

Restrições:
- Não reescrever arquitetura.
- Não implementar pull remoto complexo.
- Não mexer em UI além do estritamente necessário.

Entrega:
- Arquivos alterados
- Diffs principais
- Evidência de testes/validação
```
