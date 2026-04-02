# HANDOFF + PROMPT — S12A (UX tags-first + header fixo do app)

## Contexto atual
- S1–S11E concluídos.
- Produto consolidou modelo `visit` como escopo raiz.
- Organização funcional das notas é por `tags`.
- Feedback de QA manual:
  1) no dashboard de visita, o título da navbar está mostrando nome da visita; esperado: nome do app.
  2) no formulário de nota, ainda aparece campo "Ala/Setor"; esperado: fluxo tags-first sem campo de ala na UI.

## Objetivo do slice
Fazer ajuste de UX imediato e incremental:
1. Navbar do dashboard de visita com título fixo do app.
2. Tela de nova/edição de nota sem campo Ala/Setor e com foco em Tags no topo.

## Escopo (micro)

### 1) Header do dashboard de visita
Arquivo: `src/views/dashboard-view.ts`
- No modo de visita, usar título fixo do app (`config.app.name` ou literal consolidado no projeto).
- Não usar mais `visitName` como título da navbar.

### 2) New Note View tags-first (sem campo de ala na UI)
Arquivo: `src/views/new-note-view.ts`
- Remover bloco de input/label de Ala/Setor do formulário.
- Remover datalist/sugestões de ala da UI.
- Renderizar seção de tags antes de leito/referência/nota (tags-first).
- Ajustar mensagens de validação para não mencionar ala.

### 3) Ponte técnica mínima para não quebrar enquanto S12B não chega
Arquivo: `src/views/new-note-view.ts`
- Na hora de salvar/editar, preencher `ward` de forma transitória com primeira tag (`tags[0]`) para manter contrato atual de serviço/model.
- Não reintroduzir campo de ala na UI.

> Esta ponte é temporária e será removida em S12B (remoção estrutural de `ward`).

## Fora de escopo
- Remover `ward` do model/serviços/rules/sync (S12B).
- Remover stack `ward-stats`/`wardPreferences` (S12C).
- Refatoração ampla.

## Critérios de aceite
- Dashboard da visita mostra nome do app na navbar.
- Formulário de nota não exibe campo ala/enfermaria.
- Tags ficam visualmente no topo do formulário.
- Criação/edição de nota continua funcional sem regressões.
- Validação local verde:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

---

## Prompt pronto para colar (nova conversa / subagente)

```markdown
Você está no projeto WardFlow.

Implemente o slice **S12A - UX tags-first + header fixo do app** com diff mínimo.

Antes de codar, leia:
1) `AGENTS.md`
2) `docs/collab-slices-roadmap.md`
3) `docs/collab-slice12a-tags-first-ui-header-handoff-prompt.md`
4) `src/views/dashboard-view.ts`
5) `src/views/new-note-view.ts`
6) `src/services/db/notes-service.ts`
7) `src/config/env.ts`

## Escopo
1. Em `dashboard-view.ts`, usar título fixo do app na navbar (não usar `visitName`).
2. Em `new-note-view.ts`:
   - remover campo Ala/Setor da UI
   - remover datalist/sugestões de ala da renderização
   - tornar o fluxo tags-first (tags antes dos demais campos)
   - ajustar texto de validação para não mencionar ala
3. Ponte técnica temporária:
   - ao salvar/editar, preencher `ward` com a primeira tag para manter contrato atual de serviço/model
   - sem campo de ala visível na UI

## Restrições
- NÃO remover `ward` estruturalmente neste slice (isso é S12B).
- NÃO refatorar amplo.
- Diff pequeno e focado.

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
