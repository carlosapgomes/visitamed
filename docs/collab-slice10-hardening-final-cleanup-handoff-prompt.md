# HANDOFF + PROMPT — S10 (Hardening final + limpeza)

## Contexto atual
- S1–S9A concluídos.
- Migração para tags está funcional (dashboard + export + edição).
- Após as mudanças recentes, ainda existem artefatos legados de `ward` sem uso real no fluxo atual.

## Objetivo do slice
Fazer limpeza final de legado não utilizado e alinhamento semântico mínimo com o estado atual do produto (tags como fonte de verdade).

## Escopo (micro)

### 1) Remover artefatos legados sem uso
Remover arquivos legados não usados pelo app atual:
- `src/components/groups/ward-group.ts`
- `src/utils/group-notes-by-date-and-ward.ts`
- `src/utils/group-notes-by-date-and-ward.test.ts`

> Validar com `rg` que não há import/referência residual nesses caminhos.

### 2) Limpeza de semântica residual em export utilitário
Em `src/services/export/message-export.ts`:
- atualizar `ExportOptions.groupBy` de `'date' | 'ward' | 'none'` para `'date' | 'tag' | 'none'`
- renomear helper interno de agrupamento textual `groupByWard` para `groupByTag`
- agrupar por tag usando `note.tags` (fan-out simples; nota sem tags válidas pode ser ignorada nessa rotina)

> Este bloco é para consistência interna do utilitário (mesmo que o dashboard use `generateMessage`).

### 3) Ajustes mínimos de comentários/tipos residuais
- remover aliases/deprecations que não fazem mais sentido após limpeza (se houver)
- manter diff pequeno, sem redesign.

## Fora de escopo
- Mudança de UI/fluxo principal.
- Refatoração ampla do app.
- Novas features.

## Critérios de aceite
- Build/test/lint verdes.
- Sem referências aos arquivos legados removidos.
- Export utilitário coerente com tags.
- App funcional no fluxo atual (dashboard/tag/export/copy/share).

---

## Prompt pronto para colar (nova conversa)

```markdown
Você está no projeto WardFlow.

Implemente o slice **S10 - Hardening final + limpeza** com diff mínimo.

Antes de codar, leia:
1) `AGENTS.md`
2) `docs/collab-slices-roadmap.md`
3) `docs/collab-slice10-hardening-final-cleanup-handoff-prompt.md`
4) `src/services/export/message-export.ts`
5) `src/views/dashboard-view.ts`

## Escopo
1. Remover legados sem uso:
   - `src/components/groups/ward-group.ts`
   - `src/utils/group-notes-by-date-and-ward.ts`
   - `src/utils/group-notes-by-date-and-ward.test.ts`
2. Em `message-export.ts`:
   - `ExportOptions.groupBy`: trocar `'ward'` por `'tag'`
   - renomear `groupByWard` -> `groupByTag`
   - implementar agrupamento por tags usando `note.tags` (fan-out simples)
3. Remover comentários/aliases/deprecations residuais que ficarem obsoletos.

## Restrições
- NÃO refatorar além do necessário.
- NÃO alterar fluxos principais de UI.
- Manter compatibilidade com o estado atual baseado em tags.

## Validação obrigatória
Rodar e reportar:
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Entrega
- Arquivos alterados/removidos
- Resumo curto da limpeza
- Resultado dos 3 comandos
```
