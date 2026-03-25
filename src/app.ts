/**
 * WardFlow App
 * Componente principal que gerencia roteamento e views
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { initializeRouter, subscribeToRoute, type RouteMatch } from '@/router/router';
import { initializeAuth } from '@/services/auth/auth-service';
import { initializeFirebase } from '@/services/auth/firebase';

// Import views
import './views/landing-view';
import './views/login-view';
import './views/dashboard-view';
import './views/new-note-view';
import './views/export-message-view';
import './views/settings-view';

// Import components used in views
import './components/layout/app-shell';
import './components/layout/app-header';
import './components/groups/date-group';
import './components/groups/ward-group';
import './components/items/note-item';

@customElement('wardflow-app')
export class WardFlowApp extends LitElement {
  @state() private currentComponent = 'landing-view';

  static override styles = css`
    :host {
      display: block;
      min-height: 100vh;
      min-height: 100dvh;
    }
  `;

  constructor() {
    super();
    this.initApp();
  }

  private async initApp() {
    // Initialize Firebase
    initializeFirebase();

    // Initialize Auth
    initializeAuth();

    // Initialize Router
    initializeRouter();

    // Subscribe to route changes
    subscribeToRoute(this.handleRouteChange.bind(this));
  }

  private handleRouteChange(match: RouteMatch) {
    this.currentComponent = match.route.component;
  }

  override render() {
    // Dynamically render the current view
    switch (this.currentComponent) {
      case 'landing-view':
        return html`<landing-view></landing-view>`;
      case 'login-view':
        return html`<login-view></login-view>`;
      case 'dashboard-view':
        return html`<dashboard-view></dashboard-view>`;
      case 'new-note-view':
        return html`<new-note-view></new-note-view>`;
      case 'export-message-view':
        return html`<export-message-view></export-message-view>`;
      case 'settings-view':
        return html`<settings-view></settings-view>`;
      default:
        return html`<landing-view></landing-view>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wardflow-app': WardFlowApp;
  }
}
