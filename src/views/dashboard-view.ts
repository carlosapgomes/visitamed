/**
 * WardFlow Dashboard View
 * Tela principal com lista de notas
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { subscribeToAuth, type AuthState } from '@/services/auth/auth-service';
import { getNotesByDate } from '@/services/db/dexie-db';
import { navigate } from '@/router/router';
import type { Note } from '@/models/note';

@customElement('dashboard-view')
export class DashboardView extends LitElement {
  @state() private notes: Map<string, Note[]> = new Map();
  @state() private loading = true;
  @state() private userId = '';

  private unsubscribe?: () => void;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .dashboard-content {
      flex: 1;
      padding: var(--space-4);
      overflow-y: auto;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-10) var(--space-4);
      text-align: center;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--space-4);
    }

    .empty-title {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      margin-bottom: var(--space-2);
    }

    .empty-text {
      font-size: var(--font-sm);
      color: var(--color-muted);
    }

    .fab {
      position: fixed;
      bottom: calc(var(--space-4) + var(--safe-area-inset-bottom));
      right: var(--space-4);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background-color: var(--color-primary);
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-lg);
      color: white;
      transition: background-color var(--transition-fast), transform var(--transition-fast);
      z-index: var(--z-sticky);
    }

    .fab:hover {
      background-color: var(--color-primary-pressed);
    }

    .fab:active {
      transform: scale(0.95);
    }

    .fab svg {
      width: 24px;
      height: 24px;
    }

    .notes-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-10);
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = subscribeToAuth(this.handleAuthChange.bind(this));
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private async handleAuthChange(state: AuthState) {
    if (!state.user) {
      navigate('/login', true);
      return;
    }

    this.userId = state.user.uid;
    await this.loadNotes();
  }

  private async loadNotes() {
    if (!this.userId) return;

    this.loading = true;
    try {
      this.notes = await getNotesByDate(this.userId);
    } catch (error) {
      console.error('[Dashboard] Erro ao carregar notas:', error);
    } finally {
      this.loading = false;
    }
  }

  private handleNewNote() {
    navigate('/nova-nota');
  }

  private handleNoteClick(e: CustomEvent<{ note: Note }>) {
    // TODO: Navegar para edição de nota
    console.log('[Dashboard] Nota clicada:', e.detail.note.id);
  }

  override render() {
    return html`
      <app-header title="Notas" showMenu></app-header>

      <div class="dashboard-content">
        ${this.loading
          ? html`
              <div class="loading-container">
                <div class="loading-spinner"></div>
              </div>
            `
          : this.notes.size === 0
            ? html`
                <div class="empty-state">
                  <div class="empty-icon">📝</div>
                  <h2 class="empty-title">Nenhuma nota ainda</h2>
                  <p class="empty-text">Toque no + para criar sua primeira nota</p>
                </div>
              `
            : html`
                <div class="notes-list">
                  ${Array.from(this.notes.entries()).map(
                    ([date, dateNotes]) => html`
                      <date-group .date=${date}>
                        ${dateNotes.map(
                          (note) => html`
                            <note-item .note=${note} @note-click=${this.handleNoteClick}></note-item>
                          `
                        )}
                      </date-group>
                    `
                  )}
                </div>
              `}
      </div>

      <button class="fab" @click=${this.handleNewNote} aria-label="Nova nota">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dashboard-view': DashboardView;
  }
}
