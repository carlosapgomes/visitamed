# HANDOFF + PROMPT — S15A (Sync imediato pós-write online)

## Contexto
Após S14A-D, houve melhora importante na convergência multi-dispositivo, mas ainda existe janela eventual de atraso:
- sync por ciclo periódico,
- sync no evento `online`,
- hidratações em login.

Regra de produto desejada:
> se há internet + usuário autenticado, salvar local deve tentar sincronizar imediatamente (sem esperar ciclo).

## Objetivo do slice
Reduzir a janela de inconsistência entre dispositivos com **tentativa de sync imediata após write local enfileirado** e alinhar o ciclo automático para executar o pipeline completo de colaboração.

## Escopo (micro)

### 1) Trigger imediato pós-enqueue (fire-and-forget seguro)
Arquivos:
- `src/services/db/notes-service.ts`
- `src/services/db/visits-service.ts`
- `src/services/settings/settings-service.ts`

Após concluir transação local que enfileira sync (`syncQueue.add`):
- se `online` + `auth`, disparar `syncNow()` em fire-and-forget;
- não bloquear fluxo de UI/salvamento local;
- não lançar erro para usuário por falha de rede/sync (apenas log de warn/debug).

Entidades cobertas no slice:
- note
- visit
- visit-member
- settings

### 2) Pipeline completo no ciclo automático
Arquivo:
- `src/services/sync/sync-service.ts`

No fluxo automático (`syncIfAuthenticated`), garantir ordem:
1. `syncNow()`
2. `pullRemoteVisitMembershipsAndVisits()`
3. `pullRemoteNotes()`
4. `pullRemoteSettings()`

Observações:
- respeitar guard de concorrência já existente (`currentStatus.isSyncing` em `syncNow`);
- evitar refatoração ampla.

### 3) Testes mínimos
Arquivos prováveis:
- `src/services/sync/sync-service.test.ts`
- testes mínimos adicionais nos serviços tocados (somente se necessário para manter cobertura/comportamento esperado)

Cobertura mínima sugerida:
- validar que o pipeline automático chama também `pullRemoteVisitMembershipsAndVisits()`;
- validar que o trigger imediato pós-write não quebra fluxo local (best-effort, sem throw).

## Fora de escopo
- alterar `firestore.rules`
- mudar estratégia de retry/backoff global
- refatoração estrutural grande

## Critérios de aceite
- writes locais enfileirados (note/visit/visit-member/settings) tentam sync imediato quando online + autenticado;
- ciclo automático executa pipeline completo;
- sem regressão de sync concorrente;
- validações verdes:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

---

## Prompt pronto para colar (subagente)

```markdown
Você está no projeto WardFlow.

Implemente o slice **S15A - sync imediato pós-write online** com diff pequeno e sem refatoração ampla.

Leia antes de codar:
1) `AGENTS.md`
2) `docs/collab-slices-roadmap.md`
3) `docs/collab-slice14d-note-sync-timestamp-serialization-hotfix-handoff-prompt.md`
4) `docs/collab-slice15a-sync-imediato-pos-write-online-handoff-prompt.md`
5) `src/services/sync/sync-service.ts`
6) `src/services/db/notes-service.ts`
7) `src/services/db/visits-service.ts`
8) `src/services/settings/settings-service.ts`
9) testes relacionados em `src/services/**/**.test.ts`

## Escopo obrigatório
1. Após enqueue local de sync (`note`, `visit`, `visit-member`, `settings`), quando online + auth, disparar `syncNow()` em fire-and-forget seguro.
2. No ciclo automático de sync, alinhar pipeline completo nesta ordem:
   - `syncNow()`
   - `pullRemoteVisitMembershipsAndVisits()`
   - `pullRemoteNotes()`
   - `pullRemoteSettings()`
3. Respeitar guard de concorrência existente (`isSyncing`) e evitar duplicação de sync concorrente.
4. Adicionar/ajustar testes mínimos dos pontos alterados.

## Restrições
- NÃO alterar `firestore.rules`.
- NÃO fazer refatoração ampla.
- manter diff pequeno e focado.

## Validação obrigatória
Rodar e reportar:
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Entrega
- arquivos alterados
- resumo curto
- resultado dos 3 comandos
```
