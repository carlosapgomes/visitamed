/**
 * WardFlow Note Item
 * Componente para exibir uma nota individual
 */

import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Note } from '@/models/note';

@customElement('note-item')
export class NoteItem extends LitElement {
  @property({ type: Object }) note!: Note;
  @property({ type: Boolean }) compact = false;

  static override styles = css`
    :host {
      display: block;
    }

    .note-card {
      display: flex;
      flex-direction: column;
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .note-card:hover {
      border-color: var(--color-primary);
    }

    .note-card:active {
      box-shadow: var(--shadow-sm);
    }

    .note-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-2);
    }

    .note-bed {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
    }

    .note-reference {
      font-size: var(--font-xs);
      color: var(--color-muted);
    }

    .note-content {
      font-size: var(--font-md);
      color: var(--color-text);
      line-height: var(--line-height-normal);

      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .note-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: var(--space-2);
    }

    .note-ward {
      font-size: var(--font-xs);
      color: var(--color-muted);
      background-color: var(--color-surface);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-sm);
    }

    .sync-status {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
    }

    .sync-status.pending {
      background-color: var(--color-warning);
    }

    .sync-status.synced {
      background-color: var(--color-success);
    }

    .sync-status.failed {
      background-color: var(--color-danger);
    }

    /* Compact mode */
    :host([compact]) .note-card {
      flex-direction: row;
      align-items: center;
      gap: var(--space-3);
    }

    :host([compact]) .note-header {
      margin-bottom: 0;
      flex-direction: column;
      align-items: flex-start;
    }

    :host([compact]) .note-content {
      flex: 1;
      -webkit-line-clamp: 1;
    }

    :host([compact]) .note-footer {
      margin-top: 0;
    }
  `;

  private handleClick() {
    this.dispatchEvent(
      new CustomEvent('note-click', {
        detail: { note: this.note },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    const { bed, reference, note, ward, syncStatus } = this.note;

    return html`
      <div class="note-card" @click=${this.handleClick}>
        <div class="note-header">
          <span class="note-bed">Leito ${bed}</span>
          ${reference ? html`<span class="note-reference">${reference}</span>` : null}
        </div>

        <div class="note-content">${note}</div>

        <div class="note-footer">
          <span class="note-ward">${ward}</span>
          <span class="sync-status ${syncStatus}" title="Status: ${syncStatus}"></span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'note-item': NoteItem;
  }
}
