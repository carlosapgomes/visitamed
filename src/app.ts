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
      display: block;
      min-height: 100vh;
      min-height: 100dvh;
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

    switch (this.currentComponent) {
      case 'dashboard-view':
        return html`<dashboard-view></dashboard-view>`;
      case 'new-note-view':
        return html`<new-note-view></new-note-view>`;
      case 'login-view':
        return html`<login-view></login-view>`;
      default:
        return html`<dashboard-view></dashboard-view>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wardflow-app': WardFlowApp;
  }
}
