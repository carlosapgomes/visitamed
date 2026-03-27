/**
 * WardFlow App
 * Componente principal que gerencia roteamento e views
 */

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { initializeRouter, subscribeToRoute, type RouteMatch } from '@/router/router';
import { initializeAuth, subscribeToAuth, type AuthState } from '@/services/auth/auth-service';
import { initializeTheme } from '@/services/theme/theme-service';

// Import layout components
import './components/layout/app-header';

// Import views
import './views/dashboard-view';
import './views/new-note-view';
import './views/login-view';

@customElement('wardflow-app')
export class WardFlowApp extends LitElement {
  @state() private currentComponent = 'dashboard-view';
  @state() private isAuthLoading = true;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  constructor() {
    super();
    this.initApp();
  }

  private initApp() {
    // Inicializa tema (com fallback para preferência do sistema)
    initializeTheme();

    // Inicializa autenticação primeiro
    initializeAuth();

    // Subscribe ao estado de auth para saber quando terminou de carregar
    subscribeToAuth((state: AuthState) => {
      this.isAuthLoading = state.loading;
    });

    // Inicializa router
    initializeRouter();
    subscribeToRoute(this.handleRouteChange.bind(this));
  }

  private handleRouteChange(match: RouteMatch) {
    this.currentComponent = match.route.component;
  }

  override render() {
    // Mostra loading enquanto verifica auth
    if (this.isAuthLoading) {
      return html`
        <div class="min-vh-100 d-flex align-items-center justify-content-center text-secondary">
          Carregando...
        </div>
      `;
    }

    let view;
    switch (this.currentComponent) {
      case 'dashboard-view':
        view = html`<dashboard-view></dashboard-view>`;
        break;
      case 'new-note-view':
        view = html`<new-note-view></new-note-view>`;
        break;
      case 'login-view':
        view = html`<login-view></login-view>`;
        break;
      default:
        view = html`<dashboard-view></dashboard-view>`;
    }

    return html`${view}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wardflow-app': WardFlowApp;
  }
}
