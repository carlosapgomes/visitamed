/**
 * WardFlow Note Item
 * Componente para exibir uma nota individual em formato compacto
 */

import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Note } from '@/models/note';

@customElement('note-item')
export class NoteItem extends LitElement {
  @property({ type: Object }) note!: Note;

  static override styles = css`
    :host {
      display: block;
    }

    .note-row {
      display: flex;
      align-items: center;
      padding: var(--space-4);
      background-color: var(--color-bg);
      border-bottom: 1px solid var(--color-border);
      font-size: var(--font-md);
      color: var(--color-text);
      transition: background-color var(--transition-fast);
    }

    .note-row:hover {
      background-color: var(--color-surface);
    }

    .note-content {
      flex: 1;
      display: flex;
      align-items: center;
      min-width: 0;
      cursor: pointer;
    }

    .bed {
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      min-width: 56px;
    }

    .reference {
      font-size: var(--font-sm);
      color: var(--color-muted);
      margin-left: var(--space-1);
    }

    .separator {
      color: var(--color-border);
      margin: 0 var(--space-3);
    }

    .note-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--color-text);
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: none;
      color: var(--color-muted);
      cursor: pointer;
      border-radius: var(--radius-sm);
      margin-left: var(--space-2);
      transition: background-color var(--transition-fast), color var(--transition-fast);
    }

    .action-btn:hover {
      background-color: var(--color-bg);
      color: var(--color-text);
    }

    .action-btn:active {
      background-color: var(--color-border);
    }

    .action-btn svg {
      width: 18px;
      height: 18px;
    }
  `;

  private handleContentClick = () => {
    this.dispatchEvent(
      new CustomEvent('note-click', {
        detail: { note: this.note },
        bubbles: true,
        composed: true,
      })
    );
  };

  private handleActionClick = (e: Event) => {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('note-action', {
        detail: { note: this.note },
        bubbles: true,
        composed: true,
      })
    );
  };

  override render() {
    const { bed, reference, note } = this.note;

    return html`
      <div class="note-row">
        <div class="note-content" @click=${this.handleContentClick}>
          <span class="bed">${bed}</span>
          ${reference ? html`<span class="reference">(${reference})</span>` : null}
          <span class="separator">|</span>
          <span class="note-text">${note}</span>
        </div>
        <button class="action-btn" @click=${this.handleActionClick} aria-label="Ações da nota">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'note-item': NoteItem;
  }
}
