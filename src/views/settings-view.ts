/**
 * WardFlow Settings View
 * Tela de configurações
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { subscribeToAuth, signOutUser, type AuthState } from '@/services/auth/auth-service';
import { navigate } from '@/router/router';

@customElement('settings-view')
export class SettingsView extends LitElement {
  @state() private userEmail = '';
  @state() private signingOut = false;

  private unsubscribe?: () => void;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .settings-content {
      flex: 1;
      padding: var(--space-4);
    }

    .section {
      margin-bottom: var(--space-6);
    }

    .section-title {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--space-3);
    }

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4);
      background-color: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-2);
    }

    .setting-label {
      font-size: var(--font-md);
      color: var(--color-text);
    }

    .setting-value {
      font-size: var(--font-sm);
      color: var(--color-muted);
    }

    .btn-logout {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: var(--space-4);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      color: var(--color-danger);
      background-color: var(--color-danger-light);
      border-radius: var(--radius-md);
      transition: background-color var(--transition-fast);
    }

    .btn-logout:hover {
      background-color: var(--color-danger);
      color: white;
    }

    .btn-logout:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .version {
      text-align: center;
      padding: var(--space-4);
      font-size: var(--font-xs);
      color: var(--color-muted);
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = subscribeToAuth(this.handleAuthChange.bind(this));
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private handleAuthChange(state: AuthState) {
    if (!state.user && !state.loading) {
      navigate('/login', true);
      return;
    }

    if (state.user) {
      this.userEmail = state.user.email ?? '';
    }
  }

  private async handleLogout() {
    this.signingOut = true;
    try {
      await signOutUser();
      navigate('/', true);
    } catch (error) {
      console.error('[Settings] Erro ao fazer logout:', error);
    } finally {
      this.signingOut = false;
    }
  }

  override render() {
    return html`
      <app-header title="Configurações" showBack></app-header>

      <div class="settings-content">
        <div class="section">
          <h2 class="section-title">Conta</h2>
          <div class="setting-item">
            <span class="setting-label">Email</span>
            <span class="setting-value">${this.userEmail}</span>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Dados</h2>
          <div class="setting-item">
            <span class="setting-label">Notas expiram em</span>
            <span class="setting-value">14 dias</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Sincronização</span>
            <span class="setting-value">Automática</span>
          </div>
        </div>

        <div class="section">
          <button class="btn-logout" @click=${this.handleLogout} ?disabled=${this.signingOut}>
            ${this.signingOut ? 'Saindo...' : 'Sair da conta'}
          </button>
        </div>

        <div class="version">WardFlow v0.1.0</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-view': SettingsView;
  }
}
