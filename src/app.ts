/**
 * WardFlow App
 * Componente principal que gerencia roteamento e views
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { initializeRouter, subscribeToRoute, type RouteMatch } from '@/router/router';
import { initializeAuth, subscribeToAuth, type AuthState } from '@/services/auth/auth-service';

// Import layout components
import './components/layout/app-shell';
import './components/layout/app-header';

// Import base components
import './components/base/fab-button';

// Import views
import './views/dashboard-view';
import './views/new-note-view';
import './views/login-view';

@customElement('wardflow-app')
export class WardFlowApp extends LitElement {
  @state() private currentComponent = 'dashboard-view';
  @state() private isAuthLoading = true;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-height: 100dvh;
    }

    .app-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      max-width: 768px;
      margin: 0 auto;
    }

    .loading-screen {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      min-height: 100dvh;
      color: var(--color-muted);
      font-size: var(--font-md);
    }
  `;

  constructor() {
    super();
    this.initApp();
  }

  private initApp() {
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
      return html`<div class="loading-screen">Carregando...</div>`;
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

    return html`<div class="app-container">${view}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wardflow-app': WardFlowApp;
  }
}
