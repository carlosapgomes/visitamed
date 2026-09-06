## Why

Smoke do staging (`add-visit-admin-management` 8.3/9.2): promover/rebaixar participante não dá feedback visual de processamento — os botões apenas desabilitam, parecendo travamento (remoção já tem o padrão correto: modal de confirmação com spinner "Removendo..."). Discussão com o dono definiu estender o padrão do modal de confirmação para promover/rebaixar, em vez de spinner na linha.

## What Changes

- Promover/rebaixar passa a abrir um **modal de confirmação** (mesma estrutura visual do modal de remoção: backdrop, card central pequeno, botões Cancelar/Confirmar):
  - Promover: título "Promover a admin?", descrição "`<nome>` terá poderes de gerência de participantes e convites nesta visita.", botão "Promover", processando "Promovendo..."
  - Rebaixar: título "Rebaixar a editor?", descrição "`<nome>` perderá os poderes de gerência.", botão "Rebaixar", processando "Rebaixando..."
- Spinner + rótulo de processamento no botão Confirmar (`isChangingParticipantRole`, já existente); Cancelar/botões desabilitados durante o processamento (padrão do remover).
- Erros de alteração de papel passam a ser exibidos **dentro do modal** (mesmo formato do `removeParticipantError`); sucesso fecha o modal + toast + refresh (comportamento atual mantido).
- Guardas existentes (duplo-clique, processamento em curso) preservados.

## Capabilities

### New Capabilities

(nenhuma — refinamento de interação/feedback visual das ações já especificadas em `add-visit-admin-management` → capability `visit-member-administration`. Sem mudança de contrato de comportamento; `skip_specs: true`.)

### Modified Capabilities

(nenhuma.)

## Impact

- **Somente `src/views/dashboard-view.ts`** — estado novo (`roleChangeTarget`, `roleChangeError`), handlers de abrir/cancelar/confirmar, render do modal (generalização do padrão existente de `renderRemoveParticipantConfirm`).
- Services (`updateVisitMemberRole`), policy, rules, functions: intocados.
- Validação: build/lint/testes + smoke humano (repo não tem harness de teste para essa view).
