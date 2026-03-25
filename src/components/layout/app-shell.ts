/**
 * WardFlow App Shell
 * Container principal da aplicação
 */

import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './app-header';

@customElement('app-shell')
export class AppShell extends LitElement {
  @property({ type: Boolean }) hasHeader = true;
  @property({ type: Boolean }) hasFab = false;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-height: 100dvh;
      background-color: var(--color-bg);
    }

    .shell-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding-top: var(--header-height);
      padding-bottom: calc(var(--safe-area-inset-bottom) + var(--space-4));
    }

    :host([hasheader='false']) .shell-content {
      padding-top: 0;
    }

    ::slotted(*) {
      flex: 1;
    }
  `;

  override render() {
    return html`
      ${this.hasHeader ? html`<app-header></app-header>` : null}
      <main class="shell-content">
        <slot></slot>
      </main>
      ${this.hasFab ? html`<slot name="fab"></slot>` : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-shell': AppShell;
  }
}
