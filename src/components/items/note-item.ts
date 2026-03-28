/**
 * VisitaMed Note Item
 * Componente para exibir uma nota individual em formato compacto
 */

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Note } from '@/models/note';

@customElement('note-item')
export class NoteItem extends LitElement {
  @property({ type: Object }) note!: Note;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

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
      <div class="list-group-item px-3 py-2">
        <div class="d-flex align-items-center gap-2">
          <div class="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden" role="button" tabindex="0" @click=${this.handleContentClick}>
            <span class="fw-semibold">${bed}</span>
            ${reference ? html`<span class="text-secondary small">(${reference})</span>` : null}
            <span class="text-secondary">|</span>
            <span class="text-truncate">${note}</span>
          </div>

          <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" @click=${this.handleActionClick} aria-label="Ações da nota">
            ⋯
          </button>
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
