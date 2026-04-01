# HANDOFF + PROMPT — S8A (Agrupamento do dashboard por tags, com TDD)

## Contexto atual
- S7A/S7B concluídos: nota já possui `tags[]`, UI de tags existe e regra remove-tag-ou-nota está ativa.
- Dashboard ainda agrupa por `ward` via `groupNotesByDateAndWard`.
- Decisão de produto congelada:
  - nota com múltiplas tags deve aparecer em múltiplos grupos.

## Objetivo do slice
Trocar a **lógica de agrupamento** do dashboard para tags, com TDD focado em função pura.

## Escopo (micro)

### 1) Nova função pura de agrupamento por tags
Criar util dedicado (sugestão):
- `src/utils/group-notes-by-date-and-tag.ts`

Regras da função:
1. Entrada: `Note[]`
2. Saída agrupada por **data** e, dentro da data, por **tag**
3. Ordenação:
   - datas: desc
   - tags: alfabética asc
   - notas no grupo: `createdAt` desc
4. Uma nota com múltiplas tags aparece em todos os grupos de tag daquela data.
5. Fallback de compatibilidade:
   - se nota vier sem tags úteis, usar `ward` como tag derivada (compatibilidade com notas antigas)
6. Evitar duplicidade da mesma nota no mesmo grupo de tag (caso tags repetidas na nota).

### 2) Testes (TDD seletivo)
Criar testes em:
- `src/utils/group-notes-by-date-and-tag.test.ts`

Cobrir no mínimo:
- lista vazia
- múltiplas datas
- múltiplas tags por nota (fan-out)
- fallback para `ward` quando sem tags
- ordenação de datas/tags/notas
- dedupe de tags repetidas na mesma nota

### 3) Dashboard usa agrupamento por tags
Em `src/views/dashboard-view.ts`:
- substituir uso de `groupNotesByDateAndWard` por nova função de tags.
- manter o menor diff possível e sem refatoração ampla.
- compatibilizar formato atual da view/componentes (S8B cuidará do componente específico de tag).

## Fora de escopo
- Criar componente novo de grupo por tag (S8B).
- Alterar exportação de mensagem (S9A).
- Mudanças visuais amplas.

## Critérios de aceite
- Dashboard passa a agrupar por tags na prática.
- Nota com N tags aparece em N grupos.
- Compatível com notas antigas sem tags (fallback ward).
- `npm run typecheck`, `npm run lint`, `npm test` verdes.

---

## Prompt pronto para colar (nova conversa)

```markdown
Você está no projeto WardFlow.

Implemente o slice **S8A - Agrupamento do dashboard por tags (TDD)** com diff mínimo.

Antes de codar, leia:
1) `AGENTS.md`
2) `docs/collab-slices-roadmap.md`
3) `docs/collab-slice8a-dashboard-group-by-tags-tdd-handoff-prompt.md`
4) `src/utils/group-notes-by-date-and-ward.ts`
5) `src/utils/group-notes-by-date-and-ward.test.ts`
6) `src/views/dashboard-view.ts`
7) `src/models/tag.ts`

## Escopo
1. Criar `src/utils/group-notes-by-date-and-tag.ts` (função pura):
   - agrupar por data + tag
   - nota com múltiplas tags aparece em múltiplos grupos
   - fallback para ward quando sem tags
   - ordenação: data desc, tag asc, notas por createdAt desc
   - dedupe da mesma nota dentro do mesmo grupo
2. Criar `src/utils/group-notes-by-date-and-tag.test.ts` cobrindo os cenários principais.
3. Atualizar `src/views/dashboard-view.ts` para usar o novo agrupamento por tags, com compatibilidade mínima com componentes atuais.

## Restrições
- NÃO criar componente novo de tag neste slice.
- NÃO mudar exportação neste slice.
- NÃO fazer refatoração ampla.

## Validação obrigatória
Rodar e reportar:
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Entrega
- Arquivos alterados
- Resumo curto da lógica de agrupamento
- Resultado dos 3 comandos
```
