# Slice 008 — Convite com papel admin na UI + estados de re-aceite

## Objetivo

O modal de convite do dashboard passa a oferecer o papel `admin` para quem pode gerenciar convites; o `invite-accept-view` passa a refletir corretamente a reativação (aceite com convite novo após remoção) mantendo `access-revoked` para convites antigos. Fecha o change ponta a ponta.

## Contexto necessário

- `src/views/dashboard-view.ts` — modal de convite existente (aberto por `canInvitePeople`, botão ~805) e seleção atual de `inviteRole` (editor|viewer)
- `src/views/invite-accept-view.ts` (+ `.test.ts`): estados `accepted / already-member / invite-expired / invite-revoked / access-revoked / not-found` mapeados das respostas do endpoint (slice 005 mantém os códigos)
- `src/services/db/visit-invites-service.ts` (slice 002 já aceita admin) e `createVisitInviteInput` do modelo
- Slice 007 entregou o painel; este slice só toca convite/aceite

## Requisitos verificáveis

- **R1 — Papel admin no convite**: o seletor de papel do modal passa a incluir `admin` (além de editor/viewer) **para quem pode gerenciar convites**; o papel escolhido é persistido no convite (visível como badge `admin` nas listagens existentes de convites ativos, se houver).
- **R2 — Aceite reativado**: quando o endpoint reativa (convite novo pós-remoção), a view segue o caminho de `accepted` (pull de memberships/notes e navegação atuais) sem estado novo.
- **R3 — Convite antigo**: resposta `access-revoked` continua mapeada ao estado existente com a mensagem adequada ("seu acesso foi revogado; peça um novo convite").
- **R4 — Sem regressão**: convites editor/viewer e os demais estados (`already-member`, expirado, revogado, not-found) continuam funcionando.

## Matriz requisito -> arquivo -> teste/check

| Requisito | Arquivo(s) esperado(s) | Teste/check |
| --- | --- | --- |
| R1 | `src/views/dashboard-view.ts` | `npx vitest run src/views` + build; smoke: owner/admin cria convite admin; 2ª conta aceita e entra como admin (badge no painel do slice 007) |
| R2–R3 | `src/views/invite-accept-view.ts`, `.test.ts` | `npx vitest run src/views/invite-accept-view.test.ts` — casos de mapeamento de resposta→estado (RED nos casos novos se o mapeamento precisar mudar; se os códigos já forem mapeados corretamente, casos documentam regressão — registrar honestamente) |
| R4 | `.test.ts` existente | idem — nenhum caso existente quebra |

## Escopo e expected blast radius

```yaml
expected_files:
  - src/views/dashboard-view.ts
  - src/views/invite-accept-view.ts
  - src/views/invite-accept-view.test.ts
allowed_incidental_files: []
out_of_scope:
  - endpoints/rules/services (slices anteriores)
  - painel de participantes (slice 007)
  - novos estados de view (reusar os existentes)
```

Escalar se: o mapeamento de respostas exigir estado de UI novo (ex.: banner específico de reativação) — preferir reusar `accepted` com texto existente.

## Plano de testes do slice

### RED

- Comando: `npx vitest run src/views/invite-accept-view.test.ts`
- Falha esperada (se aplicável): casos novos de mapeamento reativação falham por caminho de resposta não coberto. R1 é UI de template — sem RED automatizado; prova por build + smoke (registrar).

### GREEN

- Mesmo comando — exit 0; `npm run build` — exit 0.

## Verificação do slice

- `npx vitest run src/views src/services/db` — exit 0
- `npx eslint src/views --max-warnings 0` — exit 0
- `npm run build` — exit 0
- Smoke ponta a ponta registrado: owner cria convite admin → convidado aceita (entra como admin) → owner rebaixa → owner remove → convidado tenta convite antigo (`access-revoked`) → owner gera convite novo → convidado reentra com o papel do convite

## Critérios de aceitação

- [ ] R1–R4 demonstrados
- [ ] Fluxo ponta a ponta da spec (`visit-member-administration`) percorrido no smoke
- [ ] Apenas os 3 arquivos do blast radius

## Contrato de handoff

Worker: ajustar modal + mapeamento de aceite, provar RED/GREEN onde aplicável, rodar verificação + smoke e parar. Não atualizar tasks.md; não commitar.
