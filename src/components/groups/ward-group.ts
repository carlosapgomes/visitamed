/**
 * WardFlow Ward Group
 * Componente para agrupar notas por ala/unidade
 */

import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ward-group')
export class WardGroup extends LitElement {
  @property({ type: String }) ward = '';
  @property({ type: Number }) noteCount = 0;

  static override styles = css`
    :host {
      display: block;
      margin-bottom: var(--space-4);
    }

    .ward-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-primary-light);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-2);
    }

    .ward-name {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--color-primary);
    }

    .ward-count {
      font-size: var(--font-sm);
      color: var(--color-muted);
      background-color: var(--color-bg);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-full);
    }

    .notes-container {
      padding-left: var(--space-4);
    }
  `;

  override render() {
    return html`
      <div class="ward-header">
        <span class="ward-name">${this.ward}</span>
        <span class="ward-count">${this.noteCount} notas</span>
      </div>
      <div class="notes-container">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ward-group': WardGroup;
  }
}
