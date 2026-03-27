/**
 * WardFlow Date Group
 * Componente para agrupar notas por data
 */

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Note } from '@/models/note';
import '../groups/ward-group';

/** Estrutura de wards agrupadas (mesma do utils/group-notes-by-date-and-ward) */
export interface WardGroupData {
  ward: string;
  notes: Note[];
}

@customElement('date-group')
export class DateGroup extends LitElement {
  @property({ type: String }) date = '';
  @property({ type: Array }) wards: WardGroupData[] = [];

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private formatDateForDisplay(date: string): string {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return date;

    const [, year, month, day] = match;
    return `${day}-${month}-${year}`;
  }

  private handleActionClick = (e: Event) => {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('date-action', {
        detail: {
          date: this.date,
          wards: this.wards,
          scopeType: 'date',
        },
        bubbles: true,
        composed: true,
      })
    );
  };

  override render() {
    return html`
      <section class="card border-0 shadow-sm">
        <div class="card-header bg-body d-flex align-items-center justify-content-between py-2">
          <span class="fw-semibold">${this.formatDateForDisplay(this.date)}</span>
          <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" @click=${this.handleActionClick} aria-label="Ações da data">
            ⋯
          </button>
        </div>
        <div class="card-body p-0">
          ${this.wards.map(
            wardGroup =>
              html`<ward-group .ward=${wardGroup.ward} .notes=${wardGroup.notes}></ward-group>`
          )}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'date-group': DateGroup;
  }
}
