/**
 * WardFlow Date Group
 * Componente para agrupar notas por data
 */

import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Note } from '@/models/note';

@customElement('date-group')
export class DateGroup extends LitElement {
  @property({ type: String }) date = '';
  @property({ type: Array }) notes: Note[] = [];

  static override styles = css`
    :host {
      display: block;
      margin-bottom: var(--space-6);
    }

    .date-header {
      display: flex;
      align-items: center;
      padding: var(--space-2) var(--space-4);
      background-color: var(--color-surface);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-muted);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-2);
    }

    .notes-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
  `;

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Hoje';
    }

    if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Ontem';
    }

    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  }

  override render() {
    return html`
      <div class="date-header">${this.formatDate(this.date)}</div>
      <div class="notes-list">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'date-group': DateGroup;
  }
}
