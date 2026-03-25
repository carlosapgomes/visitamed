/**
 * WardFlow Login View
 * Tela de login com Google
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { signInWithGoogle, subscribeToAuth, type AuthState } from '@/services/auth/auth-service';
import { navigate } from '@/router/router';

@customElement('login-view')
export class LoginView extends LitElement {
  @state() private loading = false;
  @state() private error = '';

  private unsubscribe?: () => void;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      padding: var(--space-6);
      text-align: center;
    }

    .logo {
      font-size: 48px;
      margin-bottom: var(--space-4);
    }

    .title {
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      margin-bottom: var(--space-2);
    }

    .subtitle {
      font-size: var(--font-sm);
      color: var(--color-muted);
      margin-bottom: var(--space-8);
    }

    .btn-google {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      width: 100%;
      max-width: 280px;
      padding: var(--space-4) var(--space-6);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
      background-color: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition: background-color var(--transition-fast);
    }

    .btn-google:hover {
      background-color: var(--color-surface);
    }

    .btn-google:active {
      background-color: var(--color-border);
    }

    .btn-google:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .google-icon {
      width: 20px;
      height: 20px;
    }

    .error-message {
      margin-top: var(--space-4);
      padding: var(--space-3);
      font-size: var(--font-sm);
      color: var(--color-danger);
      background-color: var(--color-danger-light);
      border-radius: var(--radius-md);
    }

    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
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
    if (state.user && !state.loading) {
      navigate('/dashboard', true);
    }
  }

  private async handleGoogleLogin() {
    this.loading = true;
    this.error = '';

    try {
      await signInWithGoogle();
      // Navigation happens via auth state change
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Erro ao fazer login';
      this.loading = false;
    }
  }

  override render() {
    return html`
      <div class="logo">🔐</div>
      <h1 class="title">Entrar no WardFlow</h1>
      <p class="subtitle">Use sua conta Google para continuar</p>

      <button class="btn-google" @click=${this.handleGoogleLogin} ?disabled=${this.loading}>
        ${this.loading
          ? html`<span class="loading-spinner"></span>`
          : html`
              <svg class="google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            `}
        <span>${this.loading ? 'Entrando...' : 'Entrar com Google'}</span>
      </button>

      ${this.error ? html`<div class="error-message">${this.error}</div>` : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'login-view': LoginView;
  }
}
