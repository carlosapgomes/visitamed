Você é um engenheiro de software sênior. Quero que você inicialize a base de um projeto chamado WardFlow.

Objetivo do produto:
WardFlow é um PWA mobile-first para médicos registrarem notas transitórias durante rounds clínicos. Não é prontuário. O foco é velocidade, simplicidade, uso offline e posterior sincronização. Nesta etapa, NÃO implemente regras de negócio completas nem features finais. Crie apenas a fundação técnica do projeto.

Stack obrigatório:
- Vite
- TypeScript
- Lit
- Dexie (IndexedDB)
- Firebase Auth
- Firestore
- PWA com vite-plugin-pwa ou Workbox
- CSS simples com design tokens e estilos locais nos componentes Lit
- Sem Tailwind
- Sem bibliotecas pesadas de UI

Requisitos desta tarefa:
1. Criar a estrutura inicial do projeto.
2. Configurar o ambiente para desenvolvimento.
3. Organizar a arquitetura de pastas.
4. Criar componentes e arquivos base mínimos.
5. Preparar a base para futuras fases: dashboard, nova nota, exportação de mensagem, login com Google, sync.
6. Não implementar ainda ASR.
7. Não implementar ainda lógica completa do produto.
8. Gerar código limpo, simples, legível e incremental.

Adicione também:

1. Configuração de linting:
- ESLint + Prettier
- TypeScript strict
- Configuração simples e funcional
- Scripts no package.json

2. Criar arquivo AGENTS.md na raiz do projeto:
- Deve conter diretrizes para desenvolvimento com agentes
- Baseado nos princípios do projeto WardFlow
- Deve orientar geração de código incremental
- Evitar overengineering
- Reforçar uso do design system



Quero que você produza:
- árvore de pastas sugerida
- conteúdo inicial dos arquivos principais
- explicação breve de cada pasta e arquivo
- comandos necessários para instalar e rodar
- placeholders mínimos onde necessário

Arquitetura desejada:
- src/
  - components/
    - base/
    - layout/
    - dashboard/
    - forms/
    - feedback/
  - views/
  - services/
    - db/
    - auth/
    - sync/
    - export/
  - styles/
  - models/
  - utils/
  - router/
  - config/
- public/
- arquivos de configuração na raiz

Crie a estrutura de forma compatível com Lit e Vite.

Requisitos de organização:
- Separar claramente UI, serviços e modelos
- Criar um app shell inicial
- Criar um app header inicial
- Criar uma dashboard view placeholder
- Criar um arquivo para design tokens CSS globais
- Criar um arquivo base de reset/normalize simples
- Criar um serviço Dexie inicial
- Criar um arquivo de configuração do Firebase com placeholders
- Criar tipos iniciais para Note, Settings e SyncQueue
- Criar um ponto central de bootstrap da aplicação
- Preparar a aplicação para PWA
- Criar manifest básico
- Criar service worker via plugin escolhido

Quero também que você siga este Mini Design System do projeto:

# WardFlow – Mini Design System (MVP 1)

## Objetivo
Este design system define padrões visuais e estruturais para o WardFlow, um PWA mobile-first focado em captura rápida de notas clínicas transitórias durante rounds hospitalares.

Princípios:
- Simplicidade
- Velocidade
- Legibilidade
- Baixa fricção
- Consistência

## Contexto de uso
- Uso em pé, durante round
- Ambiente com distrações
- Uso com uma mão
- Interações rápidas (<5s)

## Cores (Design Tokens)
:root {
  --color-bg: #ffffff;
  --color-surface: #f9fafb;
  --color-text: #111827;
  --color-muted: #6b7280;
  --color-primary: #2563eb;
  --color-primary-pressed: #1d4ed8;
  --color-border: #e5e7eb;
  --color-danger: #dc2626;
}

## Espaçamento
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
}

## Radius
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

## Tipografia
:root {
  --font-xs: 12px;
  --font-sm: 14px;
  --font-md: 16px;
  --font-lg: 18px;
  --font-xl: 20px;
}

## Regras visuais
- Fonte padrão do sistema
- Alto contraste
- Layout mobile-first
- Botões grandes
- Inputs confortáveis
- Pouca ornamentação
- Sem animações complexas

## Componentes-base previstos
- app-shell
- app-header
- fab-button
- note-item
- ward-group
- date-group
- action-sheet

Agora siga também estas decisões de produto para o MVP 1:

- Telas previstas:
  - landing
  - login
  - dashboard
  - nova nota
  - gerar mensagem
  - configurações

- Modelo inicial de nota:
  - id
  - userId
  - date
  - ward
  - bed
  - reference opcional
  - note
  - createdAt
  - expiresAt
  - syncStatus

- IndexedDB será a fonte local principal
- Firestore será usado para sincronização posterior
- Firebase Auth com Google login
- Exportação de mensagem será implementada depois
- Dashboard agrupará notas por data e por ala
- Expiração padrão de notas: 14 dias

Estrutura de saída desejada:
1. Visão geral da arquitetura
2. Árvore de pastas
3. Lista de dependências
4. Conteúdo dos arquivos principais
5. Comandos para setup
6. Próximos passos recomendados

Regras de implementação:
- Use TypeScript estrito
- Use Lit com componentes pequenos
- Use CSS local nos componentes e tokens globais no app
- Evite overengineering
- Evite adicionar bibliotecas desnecessárias
- Não invente backend além de Firebase
- Não implemente lógica de negócio que não foi pedida
- Prefira placeholders claros e comentados
- Todo arquivo criado deve ter propósito real
- O resultado deve estar pronto para eu continuar em slices pequenos depois

Também quero que você proponha uma estrutura de arquivos realista como esta, podendo ajustar se necessário:

/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.ts
    app.ts
    components/
      layout/
        app-shell.ts
        app-header.ts
      dashboard/
        dashboard-view.ts
      base/
      forms/
      feedback/
    views/
      landing-view.ts
      login-view.ts
      dashboard-view.ts
      new-note-view.ts
      export-message-view.ts
      settings-view.ts
    services/
      db/
        dexie-db.ts
      auth/
        firebase.ts
        auth-service.ts
      sync/
        sync-service.ts
      export/
        message-export.ts
    styles/
      tokens.css
      globals.css
    models/
      note.ts
      settings.ts
      sync-queue.ts
    utils/
    config/
      env.ts

Importante:
- Pode ajustar essa estrutura se encontrar uma organização melhor, mas explique.
- Quero a resposta com código e arquivos iniciais, não apenas descrição abstrata.
- Se algum arquivo ficar muito longo, mostre uma versão inicial funcional e diga o que ficará para o próximo slice.
