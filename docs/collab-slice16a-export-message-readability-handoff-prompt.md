# HANDOFF + PROMPT — S16A (Legibilidade da mensagem de exportação)

> BASE_REF: `24a3eee` · Pacote: npm · Testes: vitest · Status do baseline: typecheck ✅, 300 testes ✅
> Observação do preflight: `package-lock.json` está modificado localmente (artefato de `npm install`). Não faz parte do slice; não reverter, não commitar junto.

## Contexto atual (contexto zero)

WardFlow gera uma mensagem de texto para WhatsApp a partir das notas de uma visita. O gerador central é `generateMessage(scope)` em `src/services/export/message-export.ts` (única função usada em produção; `exportNotesAsText`/`exportNotesAsMarkdown` no mesmo arquivo são código morto — **não tocar**).

Fluxo: nota digitada em `<textarea>` (texto cru, `\n` internos preservados) → `notes-service.saveNote` (só `trim()` das pontas) → `dashboard-view.buildExportScope` → `generateMessage` → clipboard / `navigator.share` como texto cru.

Saída atual (formatação WhatsApp: negrito com `*texto*`; o `-` é apenas caractere visual):

```
*Pendências*

*Intermediário*
- I04A | aguarda RX
- I04B | preparar operatório

*UTI*
- U02 | discutir antibiótico
```

Dois defeitos de legibilidade:

1. Se `note.note` contém `\n`, o bullet quebra no meio (`- I04A | aguarda RX\nreavaliar à tarde` vira duas linhas, a segunda sem bullet).
2. Entre bullets do mesmo grupo há apenas um `\n` (linha em branco existe só entre grupos), colando os itens.

## Objetivo do slice

Cada nota renderiza como um **bullet de linha única** (quebras internas colapsadas em um espaço) e itens consecutivos ficam **separados por linha em branco**.

Saída esperada após o slice:

```
*Pendências*

*Intermediário*
- I04A | aguarda RX reavaliar à tarde

- I04B | preparar operatório


*UTI*
- U02 | discutir antibiótico
```

Nota: as **duas** linhas em branco antes de `*UTI*` são intencionais (separador de item + separador de grupo já existente). Não normalizar.

## Matriz requisito → arquivo → teste/check

| Requisito | Arquivo(s) esperado(s) | Teste/check |
| --- | --- | --- |
| R1: conteúdo da nota colapsa `\r`/`\n` (e espaços ao redor) em um único espaço; bullet final tem exatamente uma linha | `src/services/export/message-export.ts` (`formatNoteLine`) | 2 testes novos em `message-export.test.ts` (escopo tag) |
| R2: em escopo `tag`, cada bullet é seguido de linha em branco, sem sobra no fim da mensagem | `message-export.ts` (`generateTagMessage`) | 1 teste novo (escopo tag) |
| R3: em escopo `date`, linha em branco entre bullets do mesmo grupo; entre último bullet e cabeçalho do próximo grupo ficam duas linhas em branco (`\n\n\n`) | `message-export.ts` (`generateDateMessage`) | 2 testes novos (escopo date) |
| R4: doc-comment do formato em `generateMessage` reflete o novo layout (blank line entre itens, conteúdo single-line) | `message-export.ts` | inspeção (sem teste automatizado — contrato documental) |

## Decisões já tomadas (não reabrir)

- Colapsar `\n` → **espaço simples** (não `; `, não outro separador).
- Manter o `lines.push('')` existente após cada grupo em `generateDateMessage` (é ele que produz o `\n\n\n` desejado entre grupos).
- `.trim()` final dos geradores permanece (remove a sobra do último `''`).
- Sanitização acontece **na formatação da mensagem** (`formatNoteLine`), não na captura nem na persistência — notas continuam podendo ter `\n` no banco/UI.

## Implementação de referência

Em `formatNoteLine` (único ponto de sanitização):

```ts
const content = note.note.replace(/\s*[\r\n]+\s*/g, ' ').trim();
return `- ${bed}${ref} | ${content}`;
```

Nos dois loops de notas (`generateDateMessage` e `generateTagMessage`):

```ts
for (const note of ...) {
  lines.push(formatNoteLine(note));
  lines.push('');
}
```

O regex acima já cobre `\n`, `\r\n`, múltiplas quebras consecutivas e espaços ao redor.

## Escopo e expected blast radius

```yaml
expected_files:
  - src/services/export/message-export.ts
  - src/services/export/message-export.test.ts

allowed_incidental_files: []

out_of_scope:
  - views (dashboard-view, new-note-view, modais de preview/share)
  - notes-service / persistência / textarea de captura
  - exportNotesAsText / exportNotesAsMarkdown (código morto) e sua remoção
  - alterar símbolo do bullet, formato do título, cabeçalhos de tag ou agrupamento
  - docs/collab-slices-roadmap.md
  - normalizar as duas linhas em branco entre grupos para uma
```

Escalar para o humano (não ampliar o slice) se: qualquer arquivo fora de `expected_files` parecer necessário; algum dos 13 testes existentes falhar por motivo não previsto; `generateMessage` for consumido em outro lugar além de `dashboard-view.ts` e do teste.

## Plano de testes

### Novos testes (adicionar ao `message-export.test.ts`, reusando o helper `createTestNote`)

Em `describe('escopo tag')`:

1. `colapsa quebras de linha internas da nota em uma única linha` — nota `note: 'discutir antibiótico\nreavaliar em 48h'` → `expect(result).toContain('- U02 | discutir antibiótico reavaliar em 48h')`
2. `colapsa múltiplas quebras e espaços ao redor para um único espaço` — nota `note: 'aguarda RX\n\n  reavaliar à tarde'` → `expect(result).toContain('- I04A | aguarda RX reavaliar à tarde')`
3. `separa itens consecutivos com linha em branco` — duas notas → `expect(result).toContain('- I04A | aguarda RX\n\n- I04B | preparar operatório')`

Em `describe('escopo date')`:

4. `separa itens consecutivos com linha em branco dentro da tag` — uma tag, duas notas → mesmo assert `\n\n` do item 3 e `expect(result.endsWith('- I04B | preparar operatório')).toBe(true)`
5. `separa grupos com duas linhas em branco` — duas tags → `expect(result).toContain('- I04B | preparar operatório\n\n\n*UTI*')`

### RED

- comando: `npx vitest run src/services/export/message-export.test.ts`
- falha esperada: os **5 testes novos falham** (itens 1–2 porque o `\n` cru quebra o bullet; itens 3–5 porque hoje há só um `\n` entre bullets / `\n\n` entre grupos) e os **9 existentes passam**. Se algum teste existente falhar no RED, parar e escalar.

### GREEN / verificação local

- `npx vitest run src/services/export/message-export.test.ts` — exit 0, 14 testes passando (9 + 5)
- `npx vitest run src/services` — exit 0 (regressão próxima: todo o diretório de services)
- `npm run typecheck` — exit 0
- `npx eslint src/services/export --max-warnings 0` — exit 0
- `npx prettier --check src/services/export/message-export.ts src/services/export/message-export.test.ts` — exit 0 (se falhar, `npx prettier --write` nos dois arquivos)

Suíte completa (`npm test` + `npm run lint`) pertence ao gate final do change, não a este slice.

## Critérios de aceitação

- [ ] R1: bullet de nota com `\n` interno sai como uma única linha (`toContain('- ... a b')` verde)
- [ ] R2: escopo tag tem `\n\n` entre bullets e não termina com linha em branco
- [ ] R3: escopo date tem `\n\n` entre bullets do mesmo grupo e `\n\n\n` entre último bullet e tag seguinte
- [ ] R4: doc-comment do formato atualizado
- [ ] Todos os comandos de GREEN/verificação com exit 0
- [ ] Diff limitado aos 2 arquivos de `expected_files`

---

## Prompt pronto para colar (nova conversa)

```markdown
Você está no projeto WardFlow (/projects/dev/visitamed).

Implemente o slice **S16A - Legibilidade da mensagem de exportação** com diff mínimo, via TDD.

Antes de codar, leia:
1) `AGENTS.md`
2) `docs/collab-slice16a-export-message-readability-handoff-prompt.md`
3) `src/services/export/message-export.ts`
4) `src/services/export/message-export.test.ts`

## Escopo (apenas 2 arquivos)
1. `formatNoteLine`: sanitizar o conteúdo com `note.note.replace(/\s*[\r\n]+\s*/g, ' ').trim()` — bullet sempre de uma linha.
2. `generateTagMessage` e `generateDateMessage`: após cada `formatNoteLine`, `lines.push('')` (linha em branco entre itens). Manter o `push('')` pós-grupo e o `.trim()` final — entre grupos o resultado `\n\n\n` é desejado, não normalizar.
3. Atualizar o doc-comment do formato em `generateMessage`.
4. Testes novos conforme a seção "Novos testes" do handoff (5 casos, exatamente com os asserts listados).

## Ordem obrigatória
1. RED: adicionar os 5 testes e rodar `npx vitest run src/services/export/message-export.test.ts` — os 5 novos devem falhar e os 9 existentes passar. Reporte o output.
2. GREEN: implementar e rodar o mesmo comando até exit 0 (14 passando).
3. Verificação: `npx vitest run src/services`, `npm run typecheck`, `npx eslint src/services/export --max-warnings 0`, `npx prettier --check src/services/export/message-export.ts src/services/export/message-export.test.ts` — todos exit 0.

## Restrições
- NÃO tocar em views, notes-service, textarea, agrupamento, símbolo do bullet, títulos.
- NÃO tocar em exportNotesAsText/exportNotesAsMarkdown (código morto).
- NÃO normalizar as duas linhas em branco entre grupos de tag.
- NÃO commitar, não atualizar roadmap, não alterar arquivos além dos 2 listados.
- Se qualquer teste existente falhar por motivo não previsto, ou precisar de outro arquivo: PARE e reporte o bloqueio.

## Entrega
- Lista de arquivos alterados (deve ser exatamente 2)
- Resumo curto das mudanças
- Output (exit code + resumo) de cada comando da verificação
```
