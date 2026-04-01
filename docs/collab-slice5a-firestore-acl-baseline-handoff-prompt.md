# HANDOFF + PROMPT — S5A (Firestore schema colaborativo + ACL mínima)

## Contexto atual
- Colaboração local já existe (visitas, membros, convites, papéis).
- Sync remoto atual ainda usa apenas path legado por usuário (`/users/{uid}/...`) para notas/settings/wardStats.
- S4B finalizado: UX de acesso removido já diferenciada no app.

## Objetivo do slice
Criar a **base de schema + regras Firestore** para colaboração remota por visita, sem mexer ainda no sync de aplicação.

> Este slice é de infraestrutura de segurança (rules-first), não de fluxo completo remoto.

## Escopo (micro)

### 1) Definir paths colaborativos nas rules
Adicionar regras para a estrutura:
- `/visits/{visitId}`
- `/visits/{visitId}/members/{memberUserId}`
- `/visits/{visitId}/notes/{noteId}`
- `/visits/{visitId}/invites/{inviteId}`

### 2) ACL mínima baseada em papéis
Implementar helpers nas rules para:
- `isSignedIn()`
- `isActiveMember(visitId, uid)`
- `isOwner(visitId, uid)`
- `canEditVisit(visitId, uid)` (`owner` ou `editor` ativo)

Regras esperadas:
- **Visit**
  - read: membro ativo
  - create: usuário autenticado criando visita própria
  - update/delete: apenas owner
- **Members**
  - read: membro ativo da visita
  - create/update/delete: apenas owner
  - exceção de bootstrap opcional: permitir criação do member owner inicial quando `visit.userId == request.auth.uid`
- **Notes (por visita)**
  - read: membro ativo
  - create/update/delete: `canEditVisit`
  - validação mínima de coerência: `visitId` do doc = path
- **Invites**
  - read/write: apenas owner

### 3) Compatibilidade com legado
**Manter intactas** as regras existentes de `/users/{userId}/...` para não quebrar sync atual.

## Fora de escopo
- Alterar `sync-service.ts` para usar `/visits/...`.
- Implementar Cloud Functions (`acceptInvite`, etc.).
- Realtime listeners e conflitos (S5B+).
- UI de gestão de membros/convites.

## Critérios de aceite
- `firestore.rules` com blocos e helpers colaborativos mínimos.
- Regras legadas continuam presentes.
- Sem mudanças em serviços de app neste slice.
- `npm run typecheck`, `npm run lint`, `npm test` verdes.

---

## Prompt pronto para colar (nova conversa)

```markdown
Você está no projeto WardFlow.

Implemente o slice **S5A - Firestore schema colaborativo + ACL mínima** com escopo mínimo.

Antes de codar, leia:
1) `AGENTS.md`
2) `docs/collab-slices-roadmap.md`
3) `docs/collab-slice5a-firestore-acl-baseline-handoff-prompt.md`
4) `firestore.rules`

## Objetivo
Adicionar base de regras Firestore para colaboração por visita (`/visits/...`) sem alterar sync de app.

## Escopo
1. Editar `firestore.rules` para adicionar regras de:
   - `/visits/{visitId}`
   - `/visits/{visitId}/members/{memberUserId}`
   - `/visits/{visitId}/notes/{noteId}`
   - `/visits/{visitId}/invites/{inviteId}`
2. Criar helpers de ACL nas rules:
   - `isSignedIn`
   - `isActiveMember`
   - `isOwner`
   - `canEditVisit`
3. Aplicar política de acesso:
   - owner-only para gestão de membros/convites
   - owner/editor para escrita de notas da visita
   - membro ativo para leitura da visita/notas/members
4. Manter regras legadas de `/users/{userId}/...` sem quebra.

## Restrições
- NÃO alterar `src/services/sync/sync-service.ts`.
- NÃO implementar Cloud Functions.
- NÃO alterar UI.
- Fazer o menor diff possível.

## Validação obrigatória
Rodar e reportar:
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Entrega
- Arquivos alterados
- Resumo curto das regras novas
- Resultado dos 3 comandos
```
