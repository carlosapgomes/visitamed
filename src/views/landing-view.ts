/**
 * WardFlow Landing View
 * Tela inicial de boas-vindas
 */

import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { navigate } from '@/router/router';

@customElement('landing-view')
export class LandingView extends LitElement {
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
      font-size: var(--font-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      margin-bottom: var(--space-2);
    }

    .subtitle {
      font-size: var(--font-md);
      color: var(--color-muted);
      margin-bottom: var(--space-8);
      max-width: 280px;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 280px;
      padding: var(--space-4) var(--space-6);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: white;
      background-color: var(--color-primary);
      border-radius: var(--radius-md);
      transition: background-color var(--transition-fast);
    }

    .btn-primary:hover {
      background-color: var(--color-primary-pressed);
    }

    .btn-primary:active {
      transform: scale(0.98);
    }

    .features {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      margin-top: var(--space-10);
      text-align: left;
    }

    .feature {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
    }

    .feature-icon {
      font-size: var(--font-xl);
    }

    .feature-text {
      font-size: var(--font-sm);
      color: var(--color-muted);
    }

    .feature-title {
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
    }
  `;

  private handleStart() {
    navigate('/login');
  }

  override render() {
    return html`
      <div class="logo">🏥</div>
      <h1 class="title">WardFlow</h1>
      <p class="subtitle">Notas transitórias para rounds clínicos. Rápido, simples e offline.</p>

      <button class="btn-primary" @click=${this.handleStart}>Começar</button>

      <div class="features">
        <div class="feature">
          <span class="feature-icon">⚡</span>
          <div class="feature-text">
            <div class="feature-title">Captura rápida</div>
            <div>Registre notas em segundos</div>
          </div>
        </div>

        <div class="feature">
          <span class="feature-icon">📴</span>
          <div class="feature-text">
            <div class="feature-title">Funciona offline</div>
            <div>Sincroniza quando tiver conexão</div>
          </div>
        </div>

        <div class="feature">
          <span class="feature-icon">📋</span>
          <div class="feature-text">
            <div class="feature-title">Exportação fácil</div>
            <div>Gere mensagens para repasse</div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'landing-view': LandingView;
  }
}
