/**
 * WardFlow App Header
 * Cabeçalho da aplicação
 */

import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('app-header')
export class AppHeader extends LitElement {
  @property({ type: String }) override title = 'WardFlow';
  @property({ type: Boolean }) showBack = false;
  @property({ type: Boolean }) showMenu = false;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: var(--z-sticky);
      background-color: var(--color-bg);
      border-bottom: 1px solid var(--color-border);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--header-height);
      padding: 0 var(--space-4);
      padding-top: var(--safe-area-inset-top);
    }

    .header-left,
    .header-right {
      display: flex;
      align-items: center;
      min-width: 48px;
    }

    .header-title {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      text-align: center;
      flex: 1;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      color: var(--color-text);
      transition: background-color var(--transition-fast);
    }

    .icon-btn:hover {
      background-color: var(--color-surface);
    }

    .icon-btn:active {
      background-color: var(--color-border);
    }

    svg {
      width: 24px;
      height: 24px;
    }
  `;

  private handleBack() {
    this.dispatchEvent(new CustomEvent('back', { bubbles: true, composed: true }));
  }

  private handleMenu() {
    this.dispatchEvent(new CustomEvent('menu', { bubbles: true, composed: true }));
  }

  override render() {
    return html`
      <header class="header">
        <div class="header-left">
          ${this.showBack
            ? html`
                <button class="icon-btn" @click=${this.handleBack} aria-label="Voltar">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              `
            : null}
        </div>

        <h1 class="header-title">${this.title}</h1>

        <div class="header-right">
          ${this.showMenu
            ? html`
                <button class="icon-btn" @click=${this.handleMenu} aria-label="Menu">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                </button>
              `
            : null}
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-header': AppHeader;
  }
}
