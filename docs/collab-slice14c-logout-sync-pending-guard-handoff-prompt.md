# HANDOFF + PROMPT — S14C (Guard de logout com pendências de sync)

## Contexto
- S14A e S14B melhoraram hidratação e push de dados colaborativos entre dispositivos.
- Ainda existe risco de perda percebida quando usuário faz logout com itens pendentes na fila local.
- Hoje o logout limpa Dexie imediatamente (`clearLocalUserData`) sem confirmação contextual sobre pendências.

## Objetivo do slice
Evitar perda silenciosa no logout:
1. tentar sincronizar antes de sair,
2. se ainda houver pendências, pedir confirmação explícita para sair mesmo assim.

## Escopo (micro)

### 1) Guard no fluxo de logout do header
Arquivo: `src/components/layout/app-header.ts`

Implementar:
- no `handleLogout`:
  - se online: tentar `await syncNow()` antes de decidir sair
  - checar pendências via `getSyncStatus().pendingCount`
  - se `pendingCount > 0`, **não** executar logout direto; abrir modal de confirmação
  - se `pendingCount === 0`, seguir logout normal
- se offline e houver pendências, abrir modal direto

### 2) Modal de confirmação de logout com pendências
Arquivo: `src/components/layout/app-header.ts`

Adicionar modal simples (padrão dos modais já existentes):
- título: `Existem itens pendentes de sincronização`
- mensagem: informar que sair agora pode perder alterações locais ainda não enviadas
- botões:
  - `Continuar sincronizando` (fecha modal)
  - `Sair mesmo assim` (executa logout atual)

### 3) Regras
- Não alterar comportamento quando não há pendências.
- Não bloquear logout para sempre: usuário pode forçar saída via modal.
- Reaproveitar o máximo possível do fluxo atual de logout e modais do header.

## Fora de escopo
- mudar `clearLocalUserData`
- reestruturar auth/sync arquiteturalmente
- criar telas novas
- refatoração ampla

## Critérios de aceite
- com pendências de sync, logout não ocorre silenciosamente: modal é exibido
- sem pendências, logout mantém fluxo atual
- modo offline com pendências também exibe modal
- validações verdes:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

---

## Prompt pronto para colar (nova conversa / subagente)

```markdown
Você está no projeto WardFlow.

Implemente o slice **S14C - Guard de logout com pendências de sync** com diff mínimo.

Antes de codar, leia:
1) `AGENTS.md`
2) `docs/collab-slices-roadmap.md`
3) `docs/collab-slice14c-logout-sync-pending-guard-handoff-prompt.md`
4) `src/components/layout/app-header.ts`
5) `src/services/sync/sync-service.ts`

## Escopo obrigatório
1. Em `app-header.ts`, no fluxo de logout:
   - tentar `syncNow()` quando online
   - checar `getSyncStatus().pendingCount`
   - se pendente > 0, abrir modal de confirmação e não sair imediatamente
   - se pendente == 0, seguir logout normal
2. Implementar modal de confirmação no próprio header:
   - título e mensagem de risco de perda
   - ações: `Continuar sincronizando` e `Sair mesmo assim`
3. Manter fluxo atual inalterado quando não há pendências.

## Restrições
- NÃO refatorar amplo.
- NÃO alterar firestore.rules.
- NÃO criar novas views.
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
