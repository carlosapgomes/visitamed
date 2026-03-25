/**
 * WardFlow Export Message View
 * Tela para exportar notas como mensagem
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { subscribeToAuth, type AuthState } from '@/services/auth/auth-service';
import { db } from '@/services/db/dexie-db';
import { exportNotesAsText, copyToClipboard, type ExportOptions } from '@/services/export/message-export';
import { navigate, goBack } from '@/router/router';
import type { Note } from '@/models/note';

@customElement('export-message-view')
export class ExportMessageView extends LitElement {
  @state() private notes: Note[] = [];
  @state() private loading = true;
  @state() private exportedText = '';
  @state() private copied = false;
  @state() private userId = '';

  @state() private options: ExportOptions = {
    format: 'text',
    includeReference: true,
    groupBy: 'date',
  };

  private unsubscribe?: () => void;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .export-content {
      flex: 1;
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      overflow-y: auto;
    }

    .options-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .option-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .option-label {
      font-size: var(--font-sm);
      color: var(--color-text);
    }

    select {
      padding: var(--space-2) var(--space-3);
      font-size: var(--font-sm);
      background-color: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
      background-color: var(--color-border);
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }

    .toggle.active {
      background-color: var(--color-primary);
    }

    .toggle-knob {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background-color: white;
      border-radius: var(--radius-full);
      transition: transform var(--transition-fast);
    }

    .toggle.active .toggle-knob {
      transform: translateX(20px);
    }

    .preview-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 200px;
    }

    .preview-label {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
      margin-bottom: var(--space-2);
    }

    .preview-text {
      flex: 1;
      padding: var(--space-3);
      font-size: var(--font-sm);
      font-family: monospace;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      white-space: pre-wrap;
      overflow-y: auto;
    }

    .actions {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-4);
      padding-bottom: calc(var(--space-4) + var(--safe-area-inset-bottom));
    }

    .btn {
      flex: 1;
      padding: var(--space-4);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      border-radius: var(--radius-md);
      transition: background-color var(--transition-fast);
    }

    .btn-secondary {
      background-color: var(--color-surface);
      color: var(--color-text);
    }

    .btn-secondary:hover {
      background-color: var(--color-border);
    }

    .btn-primary {
      background-color: var(--color-primary);
      color: white;
    }

    .btn-primary:hover {
      background-color: var(--color-primary-pressed);
    }

    .btn-success {
      background-color: var(--color-success);
      color: white;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-10);
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
    if (!state.user && !state.loading) {
      navigate('/login', true);
      return;
    }

    if (state.user) {
      this.userId = state.user.uid;
      await this.loadNotes();
    }
  }

  private async loadNotes() {
    if (!this.userId) return;

    this.loading = true;
    try {
      this.notes = await db.notes.where('userId').equals(this.userId).toArray();
      this.updateExportedText();
    } catch (error) {
      console.error('[Export] Erro ao carregar notas:', error);
    } finally {
      this.loading = false;
    }
  }

  private updateExportedText() {
    this.exportedText = exportNotesAsText(this.notes, this.options);
  }

  private handleGroupByChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as 'date' | 'ward' | 'none';
    this.options = { ...this.options, groupBy: value };
    this.updateExportedText();
  }

  private toggleReference() {
    this.options = { ...this.options, includeReference: !this.options.includeReference };
    this.updateExportedText();
  }

  private async handleCopy() {
    const success = await copyToClipboard(this.exportedText);
    if (success) {
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    }
  }

  private handleBack() {
    goBack();
  }

  override render() {
    return html`
      <app-header title="Exportar" showBack></app-header>

      <div class="export-content">
        ${this.loading
          ? html`<p>Carregando...</p>`
          : this.notes.length === 0
            ? html`
                <div class="empty-state">
                  <div class="empty-icon">📋</div>
                  <h2 class="empty-title">Sem notas para exportar</h2>
                  <p class="empty-text">Crie algumas notas primeiro</p>
                </div>
              `
            : html`
                <div class="options-group">
                  <div class="option-row">
                    <span class="option-label">Agrupar por</span>
                    <select .value=${this.options.groupBy} @change=${this.handleGroupByChange}>
                      <option value="date">Data</option>
                      <option value="ward">Ala</option>
                      <option value="none">Sem agrupamento</option>
                    </select>
                  </div>

                  <div class="option-row">
                    <span class="option-label">Incluir referência</span>
                    <div
                      class="toggle ${this.options.includeReference ? 'active' : ''}"
                      @click=${this.toggleReference}
                    >
                      <div class="toggle-knob"></div>
                    </div>
                  </div>
                </div>

                <div class="preview-container">
                  <span class="preview-label">Pré-visualização</span>
                  <pre class="preview-text">${this.exportedText}</pre>
                </div>
              `}
      </div>

      <div class="actions">
        <button class="btn btn-secondary" @click=${this.handleBack}>Voltar</button>
        <button
          class="btn ${this.copied ? 'btn-success' : 'btn-primary'}"
          @click=${this.handleCopy}
          ?disabled=${this.notes.length === 0}
        >
          ${this.copied ? '✓ Copiado!' : 'Copiar'}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'export-message-view': ExportMessageView;
  }
}
