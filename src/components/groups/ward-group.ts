/**
 * VisitaMed Ward Group
 * Componente para agrupar notas por ala/unidade
 */

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Note } from '@/models/note';
import '../items/note-item';

@customElement('ward-group')
export class WardGroup extends LitElement {
  @property({ type: String }) ward = '';
  @property({ type: Array }) notes: Note[] = [];

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private handleActionClick = (e: Event) => {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('ward-action', {
        detail: {
          ward: this.ward,
          notes: this.notes,
          scopeType: 'ward',
        },
        bubbles: true,
        composed: true,
      })
    );
  };

  override render() {
    return html`
      <section class="${this.notes.length ? '' : 'pb-2'}">
        <div class="d-flex align-items-center justify-content-between px-3 pt-3 pb-2 border-top">
          <span class="text-uppercase small fw-semibold text-secondary">${this.ward}</span>
          <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" @click=${this.handleActionClick} aria-label="Ações da ala">
            ⋯
          </button>
        </div>
        <div class="list-group list-group-flush">
          ${this.notes.map(note => html`<note-item .note=${note}></note-item>`)}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ward-group': WardGroup;
  }
}
