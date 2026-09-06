# visit-member-administration Specification

## Purpose

Permitir que o dono de uma visita colabore delegue a administração da visita a outros participantes (admins), cobrindo gerência de participantes (listar, remover, promover/rebaixar) e de convites, sem transferir a propriedade da visita.

## Requirements

### Requirement: Hierarquia de papéis da visita

A visita em modo grupo SHALL suportar os papéis `owner`, `admin`, `editor` e `viewer`, em ordem decrescente de privilégio. O papel `admin` SHALL incluir todos os privilégios de `editor` (criar/editar/excluir notas) e SHALL receber os privilégios de gerência definidos nesta especificação. Apenas o `owner` SHALL poder excluir a visita para todos.

#### Scenario: Admin edita notas como editor

- **WHEN** um membro com papel `admin` cria ou edita uma nota da visita
- **THEN** a operação é permitida, com os mesmos direitos de um `editor`

#### Scenario: Admin não exclui a visita

- **WHEN** um membro com papel `admin` (mas não `owner`) tenta excluir a visita para todos
- **THEN** a operação é negada

### Requirement: Múltiplos admins com owner único

A visita SHALL suportar qualquer número de membros com papel `admin` simultaneamente. O papel `owner` SHALL permanecer único e fixo: é o criador da visita e não SHALL ser removido, rebaixado, alterado ou transferido por qualquer operação desta capacidade (incluindo escritas diretas no Firestore).

#### Scenario: Visita com dois admins

- **WHEN** o owner promove um membro `editor` a `admin` em uma visita que já possui outro `admin`
- **THEN** a visita passa a ter dois membros `admin` ativos e o owner permanece inalterado

#### Scenario: Owner é intocável

- **WHEN** um admin tenta remover, rebaixar ou alterar o papel do membro owner da visita
- **THEN** a operação é negada com erro de privilégio

### Requirement: Listar participantes

O owner e qualquer `admin` SHALL poder listar todos os membros ativos da visita, com papel, estado e nome de exibição de cada membro. Membros `editor`/`viewer` NÃO ganham esse poder de listagem. A listagem SHALL funcionar sem novos índices compostos do Firestore.

#### Scenario: Owner lista participantes

- **WHEN** o owner abre o painel de participantes da visita
- **THEN** o sistema exibe todos os membros ativos, cada um com seu papel indicado (dono, admin, editor, viewer)

#### Scenario: Admin lista participantes

- **WHEN** um admin abre o painel de participantes
- **THEN** o sistema exibe a mesma lista completa, incluindo o owner

#### Scenario: Editor não lista participantes

- **WHEN** um membro `editor` tenta listar todos os membros da visita
- **THEN** a operação é negada pelas regras de segurança

### Requirement: Remover participante

O owner e qualquer `admin` SHALL poder remover um membro ativo da visita, marcando o membership como removido. A remoção SHALL ser negada quando: o alvo for o owner, o alvo for o próprio solicitante (auto-remoção usa "sair da visita") ou o solicitante não for owner/admin ativo. O membro removido SHALL perder os privilégios de acesso no servidor imediatamente após a remoção.

#### Scenario: Admin remove editor

- **WHEN** um admin remove um membro `editor` ativo
- **THEN** o membership do editor é marcado como removido e o editor perde acesso à visita no servidor

#### Scenario: Tentativa de remover o owner

- **WHEN** um admin tenta remover o membro owner
- **THEN** a operação é negada com erro explícito

#### Scenario: Tentativa de auto-remoção

- **WHEN** um admin tenta remover a si mesmo pela gerência de participantes
- **THEN** a operação é negada com erro explícito

### Requirement: Promover e rebaixar admin

O owner e qualquer `admin` SHALL poder alterar o papel de um membro ativo entre `admin`, `editor` e `viewer`, desde que o alvo não seja o owner nem o próprio solicitante. A alteração SHALL valer no servidor imediatamente (o novo papel passa a reger as permissões do alvo a partir da mudança).

#### Scenario: Promover editor a admin

- **WHEN** o owner promove um membro `editor` ativo a `admin`
- **THEN** o membro passa a exercer os privilégios de admin (gerência de participantes e convites) no servidor

#### Scenario: Rebaixar admin a editor

- **WHEN** um admin rebaixa outro admin a `editor`
- **THEN** o membro perde os privilégios de gerência no servidor

#### Scenario: Auto-alteração de papel é negada

- **WHEN** um admin tenta alterar o próprio papel
- **THEN** a operação é negada com erro explícito

### Requirement: Convites administrados por admin

O owner e qualquer `admin` SHALL poder criar e revogar convites da visita, e um convite SHALL poder conceder o papel `admin` ao convidado. Convites SHALL continuar recusando os papéis `owner`. Membros `editor`/`viewer` continuam sem poder criar convites.

#### Scenario: Admin cria convite

- **WHEN** um admin gera um link de convite para a visita
- **THEN** o convite é criado e fica rastreável com o admin como criador

#### Scenario: Convite de papel admin

- **WHEN** um admin ou o owner cria um convite com papel `admin` e um convidado o aceita
- **THEN** o convidado entra na visita como `admin`

#### Scenario: Editor não cria convite

- **WHEN** um membro `editor` tenta criar ou revogar um convite
- **THEN** a operação é negada

### Requirement: Re-entrada de membro removido

Um membro removido SHALL poder retornar à visita somente ao aceitar um convite criado **após** o momento da sua remoção; nesse caso o membership SHALL ser reativado com o papel do novo convite. Convites criados antes da remoção continuam negados a ele (estado `access-revoked`).

#### Scenario: Retorno com convite novo

- **WHEN** um membro removido aceita um convite criado depois da sua remoção
- **THEN** seu membership é reativado, ativo, com o papel do novo convite, e ele volta a acessar a visita

#### Scenario: Retorno com convite antigo é negado

- **WHEN** um membro removido tenta aceitar um convite criado antes da sua remoção
- **THEN** o aceite é negado com estado `access-revoked`

### Requirement: Nome de exibição do participante

Ao aceitar um convite, o sistema SHALL capturar o nome de exibição do perfil de autenticação do convidado e armazená-lo no membership (campo opcional). A lista de participantes SHALL exibir esse nome quando existente e, caso contrário, um identificador truncado do uid.

#### Scenario: Nome capturado no aceite

- **WHEN** um convidado com nome de perfil aceita um convite
- **THEN** o membership armazena o nome e a lista de participantes o exibe

#### Scenario: Sem nome disponível

- **WHEN** a lista é renderizada para um membro sem nome armazenado
- **THEN** o sistema exibe um identificador truncado do uid no lugar do nome

### Requirement: Painel de participantes no dashboard

O dashboard da visita SHALL oferecer, a owner e admins, um painel de participantes com as ações de listar, remover e promover/rebaixar definidas nesta especificação. O painel e suas ações SHALL ser ocultos para `editor`/`viewer`. O modal de convite SHALL oferecer a escolha do papel `admin` para quem pode gerenciar convites.

#### Scenario: Painel visível para admin

- **WHEN** um admin abre o dashboard de uma visita em modo grupo
- **THEN** o painel de participantes está disponível com as ações de gerência

#### Scenario: Painel oculto para editor

- **WHEN** um editor abre o dashboard da visita
- **THEN** nenhuma ação de gerência de participantes é exibida
