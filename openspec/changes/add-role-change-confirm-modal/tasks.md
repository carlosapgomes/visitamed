## 1. Modal de confirmação de promoção/rebaixamento

- [x] 1.1 Em `src/views/dashboard-view.ts`: estado `roleChangeTarget: { member: VisitMember; action: 'promote' | 'demote' } | null` + `roleChangeError: string`; handlers `handleParticipantRoleClick(target, action)` (abre modal, limpa erro, bloqueado se busy), `handleRoleChangeCancel` (bloqueado durante processamento), e adaptar `handleParticipantRoleChange` para consumir `roleChangeTarget` (mantendo guardas, `finally` limpando flag)
- [x] 1.2 Render do modal: generalizar o padrão de `renderRemoveParticipantConfirm` (pode extrair um renderer parametrizado por título/descrição/rótulo/rótulo-de-processamento/erro, desde que o markup permaneça o mesmo do remover — backdrop, `modal-sm` centrado, Cancelar + Confirmar com `?disabled` e spinner `spinner-border-sm`); cópias por ação conforme proposal ("Promover a admin?"/"Promovendo...", "Rebaixar a editor?"/"Rebaixando..."); erro `roleChangeError` dentro do modal no formato do `removeParticipantError`. O overlay de confirmação deve preservar a ordem/renderização atual (mesmo posicionamento do remover) e garantir que o painel subjacente não receba interação durante a confirmação (mesmo comportamento do remover; sem focus trap novo)
- [x] 1.3 Clicar em "Promover a admin"/"Rebaixar a editor" na linha passa a abrir o modal (linha continua com `isBusy` desabilitando tudo durante processamento); sucesso fecha modal + `showTemporaryToast` + `refreshParticipantsList()` (mantidos)
- [x] 1.4 Erros: dentro do modal usar `getParticipantManagementError`/`getParticipantNetworkError` (existentes); se `participantsActionError` ficar sem usos após a mudança, remover o estado/banner órfão (sem deixar código morto)

## 2. Gate

- [x] 2.1 `npm run lint` + `npm test` + `npm run build` verdes; commit atômico do change
- [ ] 2.2 Smoke humano (pendente, operador): (a) promover/rebaixar abrem modal com spinner "Promovendo..."/"Rebaixando..." no Confirmar; (b) sucesso fecha o modal + toast + lista atualizada; (c) erro aparece dentro do modal; (d) Cancelar (botão) durante processamento bloqueado; (e) cancelar normal e pelo backdrop fecham sem chamar o service; (f) remover segue inalterado

## Notas

- Refinamento visual/interativo: `skip_specs: true` (ações e efeitos já especificados na capability `visit-member-administration`).
- Blast radius: **apenas `src/views/dashboard-view.ts`**.
- Sem harness de teste de view no repo (padrão conhecido): validação por build/lint/suite + smoke humano.
