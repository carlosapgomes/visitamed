/**
 * WardFlow Dashboard View
 * Tela principal do aplicativo
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { navigate } from '@/router/router';
import { getAllNotes, deleteNotes } from '@/services/db/notes-service';
import { groupNotesByDateAndWard } from '@/utils/group-notes-by-date-and-ward';
import { generateMessage, copyToClipboard, type ExportScope } from '@/services/export/message-export';
import type { Note } from '@/models/note';
import type { WardGroupData } from '@/components/groups/date-group';
import '../components/base/fab-button';
import '../components/groups/date-group';
import '../components/feedback/action-sheet';

/** Ações disponíveis no action sheet de grupo */
const ACTIONS = [
  { id: 'preview', label: 'Pré-visualizar' },
  { id: 'copy', label: 'Copiar mensagem' },
  { id: 'share', label: 'Compartilhar' },
  { id: 'delete', label: 'Excluir' },
];

/** Ações disponíveis no action sheet de nota individual */
const NOTE_ACTIONS = [
  { id: 'edit', label: 'Editar' },
  { id: 'delete', label: 'Excluir' },
];

/** Tipo de escopo selecionado */
type SelectedScope =
  | { type: 'date'; date: string; wards: WardGroupData[] }
  | { type: 'ward'; ward: string; notes: Note[] }
  | null;

@customElement('dashboard-view')
export class DashboardView extends LitElement {
  @state() private notes: Note[] = [];
  @state() private isLoading = true;
  @state() private isActionSheetOpen = false;
  @state() private selectedScope: SelectedScope = null;
  @state() private selectedTitle = '';
  @state() private showToast = false;
  @state() private toastMessage = '';
  @state() private isPreviewOpen = false;
  @state() private previewMessage = '';
  @state() private isDeleteConfirmOpen = false;
  @state() private isNoteActionSheetOpen = false;
  @state() private selectedNote: Note | null = null;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .dashboard-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding-top: var(--header-height);
    }

    .notes-list {
      display: flex;
      flex-direction: column;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-6);
      padding-bottom: calc(var(--space-6) + 80px);
    }

    .empty-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-8) var(--space-6);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      text-align: center;
      max-width: 320px;
    }

    .empty-icon {
      width: 64px;
      height: 64px;
      color: var(--color-muted);
      margin-bottom: var(--space-5);
      opacity: 0.6;
    }

    .empty-title {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      margin-bottom: var(--space-2);
    }

    .empty-subtitle {
      font-size: var(--font-md);
      color: var(--color-muted);
      line-height: var(--line-height-relaxed);
    }

    .empty-hint {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-5);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border);
      font-size: var(--font-sm);
      color: var(--color-muted);
    }

    .empty-hint svg {
      width: 16px;
      height: 16px;
      color: var(--color-primary);
    }

    .loading {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-muted);
      font-size: var(--font-md);
    }

    /* Preview styles */
    .preview-container {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .preview-header {
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }

    .preview-title {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
    }

    .preview-content {
      flex: 1;
      padding: var(--space-4);
      overflow-y: auto;
    }

    .preview-message {
      white-space: pre-wrap;
      font-family: var(--font-family);
      font-size: var(--font-md);
      line-height: var(--line-height-relaxed);
      color: var(--color-text);
    }

    .preview-actions {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-4);
      padding-bottom: calc(var(--space-4) + var(--safe-area-inset-bottom));
      border-top: 1px solid var(--color-border);
    }

    .btn {
      flex: 1;
      padding: var(--space-4);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }

    .btn-secondary {
      background-color: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);
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

    /* Toast styles */
    .toast {
      position: fixed;
      bottom: calc(80px + var(--safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--color-text);
      color: var(--color-bg);
      padding: var(--space-3) var(--space-5);
      border-radius: var(--radius-full);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      z-index: var(--z-toast);
      opacity: 0;
      transition: opacity var(--transition-normal);
    }

    .toast.visible {
      opacity: 1;
    }

    /* Delete confirm dialog */
    .delete-dialog-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: var(--z-modal);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
    }

    .delete-dialog {
      background-color: var(--color-bg);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      max-width: 320px;
      width: 100%;
      box-shadow: var(--shadow-lg);
    }

    .delete-dialog-title {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      margin-bottom: var(--space-2);
    }

    .delete-dialog-message {
      font-size: var(--font-md);
      color: var(--color-muted);
      margin-bottom: var(--space-5);
      line-height: var(--line-height-relaxed);
    }

    .delete-dialog-actions {
      display: flex;
      gap: var(--space-3);
    }

    .btn-danger {
      background-color: var(--color-danger);
      color: white;
      border: none;
    }

    .btn-danger:hover {
      background-color: #b91c1c;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    void this.loadNotes();
  }

  private async loadNotes(): Promise<void> {
    try {
      this.isLoading = true;
      this.notes = await getAllNotes();
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
      this.notes = [];
    } finally {
      this.isLoading = false;
    }
  }

  private handleFabClick = () => {
    navigate('/nova-nota');
  };

  private handleDateAction = (e: CustomEvent<{
    date: string;
    wards: WardGroupData[];
    scopeType: 'date';
  }>) => {
    this.selectedScope = { type: 'date', date: e.detail.date, wards: e.detail.wards };
    this.selectedTitle = e.detail.date;
    this.isActionSheetOpen = true;
  };

  private handleWardAction = (e: CustomEvent<{
    ward: string;
    notes: Note[];
    scopeType: 'ward';
  }>) => {
    this.selectedScope = { type: 'ward', ward: e.detail.ward, notes: e.detail.notes };
    this.selectedTitle = e.detail.ward;
    this.isActionSheetOpen = true;
  };

  private handleNoteAction = (e: CustomEvent<{ note: Note }>) => {
    this.selectedNote = e.detail.note;
    this.selectedTitle = `${e.detail.note.bed}${e.detail.note.reference ? ` (${e.detail.note.reference})` : ''}`;
    this.isNoteActionSheetOpen = true;
  };

  private handleNoteActionSelected = (e: CustomEvent<{ actionId: string }>) => {
    const { actionId } = e.detail;

    if (actionId === 'edit' && this.selectedNote) {
      navigate(`/editar-nota/${this.selectedNote.id}`);
      this.isNoteActionSheetOpen = false;
    } else if (actionId === 'delete' && this.selectedNote) {
      this.isNoteActionSheetOpen = false;
      this.isDeleteConfirmOpen = true;
    }
  };

  private handleNoteActionSheetClosed = () => {
    this.isNoteActionSheetOpen = false;
    this.selectedNote = null;
  };

  private handleActionSelected = async (e: CustomEvent<{ actionId: string }>) => {
    const { actionId } = e.detail;

    if (actionId === 'copy' && this.selectedScope) {
      await this.handleCopyMessage();
      this.isActionSheetOpen = false;
    } else if (actionId === 'preview' && this.selectedScope) {
      this.handlePreviewMessage();
      this.isActionSheetOpen = false;
    } else if (actionId === 'share' && this.selectedScope) {
      await this.handleShareMessage();
      this.isActionSheetOpen = false;
    } else if (actionId === 'delete' && this.selectedScope) {
      this.isActionSheetOpen = false;
      this.isDeleteConfirmOpen = true;
    }
  };

  private buildExportScope(): ExportScope | null {
    if (!this.selectedScope) return null;

    return this.selectedScope.type === 'date'
      ? { type: 'date', date: this.selectedScope.date, wards: this.selectedScope.wards }
      : { type: 'ward', ward: this.selectedScope.ward, notes: this.selectedScope.notes };
  }

  private async handleCopyMessage(): Promise<void> {
    const scope = this.buildExportScope();
    if (!scope) return;

    const message = generateMessage(scope);
    const success = await copyToClipboard(message);

    if (success) {
      this.showTemporaryToast('Mensagem copiada');
    }
  }

  private handleShareMessage = async (): Promise<void> => {
    const scope = this.buildExportScope();
    if (!scope) return;

    const message = generateMessage(scope);

    // Feature detection: verificar se navigator.share está disponível
    const canShare = 'share' in navigator && typeof navigator.share === 'function';

    if (canShare) {
      try {
        await navigator.share({ text: message });
        return; // Sucesso - sem toast
      } catch {
        // Usuário cancelou ou erro - fallback para copiar
      }
    }

    // Fallback: copiar para clipboard
    const success = await copyToClipboard(message);
    if (success) {
      this.showTemporaryToast('Mensagem copiada');
    }
  };

  private handlePreviewMessage(): void {
    const scope = this.buildExportScope();
    if (!scope) return;

    this.previewMessage = generateMessage(scope);
    this.isPreviewOpen = true;
  }

  private handlePreviewCopy = async (): Promise<void> => {
    const success = await copyToClipboard(this.previewMessage);

    if (success) {
      this.showTemporaryToast('Mensagem copiada');
    }
  };

  private handlePreviewClose = (): void => {
    this.isPreviewOpen = false;
    this.previewMessage = '';
  };

  private getNoteIdsToDelete(): string[] {
    // Se há uma nota individual selecionada
    if (this.selectedNote) {
      return [this.selectedNote.id];
    }

    if (!this.selectedScope) return [];

    if (this.selectedScope.type === 'ward') {
      return this.selectedScope.notes.map(n => n.id);
    }

    // Para date, coleta todos os IDs de todas as wards
    return this.selectedScope.wards.flatMap(w => w.notes.map(n => n.id));
  }

  private handleDeleteConfirm = async (): Promise<void> => {
    const noteIds = this.getNoteIdsToDelete();

    if (noteIds.length === 0) {
      this.isDeleteConfirmOpen = false;
      return;
    }

    try {
      await deleteNotes(noteIds);
      this.showTemporaryToast(`${String(noteIds.length)} nota(s) excluída(s)`);
      await this.loadNotes();
    } catch (error) {
      console.error('Erro ao excluir notas:', error);
      this.showTemporaryToast('Erro ao excluir notas');
    } finally {
      this.isDeleteConfirmOpen = false;
      this.selectedScope = null;
      this.selectedNote = null;
    }
  };

  private handleDeleteCancel = (): void => {
    this.isDeleteConfirmOpen = false;
    this.selectedScope = null;
    this.selectedNote = null;
  };

  private showTemporaryToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 2000);
  }

  private handleSheetClosed = () => {
    this.isActionSheetOpen = false;
  };

  private renderEmptyState() {
    return html`
      <div class="empty-state">
        <div class="empty-card">
          <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="empty-title">Nenhuma nota ainda</p>
          <p class="empty-subtitle">Comece criando uma nova nota para registrar suas observações clínicas</p>
          <div class="empty-hint">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Toque no botão abaixo para adicionar</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderNotesList() {
    const groupedNotes = groupNotesByDateAndWard(this.notes);

    return html`
      <div class="notes-list" @note-action=${this.handleNoteAction}>
        ${groupedNotes.map(
          (group) => html`
            <date-group
              .date=${group.date}
              .wards=${group.wards}
              @date-action=${this.handleDateAction}
              @ward-action=${this.handleWardAction}
            ></date-group>
          `
        )}
      </div>
    `;
  }

  private renderDashboardContent() {
    return html`
      <app-header title="WardFlow"></app-header>

      <div class="dashboard-content">
        ${this.isLoading
          ? html`<div class="loading">Carregando...</div>`
          : this.notes.length > 0
            ? this.renderNotesList()
            : this.renderEmptyState()}
      </div>

      <fab-button icon="plus" label="Nova nota" @fab-click=${this.handleFabClick}></fab-button>
    `;
  }

  private renderPreview() {
    return html`
      <app-header title="WardFlow"></app-header>

      <div class="preview-container">
        <div class="preview-header">
          <h2 class="preview-title">Pré-visualizar mensagem</h2>
        </div>

        <div class="preview-content">
          <pre class="preview-message">${this.previewMessage}</pre>
        </div>

        <div class="preview-actions">
          <button class="btn btn-secondary" @click=${this.handlePreviewClose}>
            Fechar
          </button>
          <button class="btn btn-primary" @click=${this.handlePreviewCopy}>
            Copiar
          </button>
        </div>
      </div>
    `;
  }

  private renderToast() {
    return html`
      <div class="toast ${this.showToast ? 'visible' : ''}">
        ${this.toastMessage}
      </div>
    `;
  }

  override render() {
    return html`
      ${this.isPreviewOpen ? this.renderPreview() : this.renderDashboardContent()}

      <action-sheet
        .visible=${this.isActionSheetOpen}
        .title=${this.selectedTitle}
        .actions=${ACTIONS}
        @action-selected=${this.handleActionSelected}
        @sheet-closed=${this.handleSheetClosed}
      ></action-sheet>

      <action-sheet
        .visible=${this.isNoteActionSheetOpen}
        .title=${this.selectedTitle}
        .actions=${NOTE_ACTIONS}
        @action-selected=${this.handleNoteActionSelected}
        @sheet-closed=${this.handleNoteActionSheetClosed}
      ></action-sheet>

      ${this.renderToast()}

      ${this.renderDeleteConfirm()}
    `;
  }

  private renderDeleteConfirm() {
    if (!this.isDeleteConfirmOpen) return null;

    const count = this.getNoteIdsToDelete().length;
    let scopeLabel = '';
    if (this.selectedNote) {
      scopeLabel = 'desta nota';
    } else if (this.selectedScope?.type === 'date') {
      scopeLabel = 'desta data';
    } else if (this.selectedScope?.type === 'ward') {
      scopeLabel = 'desta ala';
    }

    return html`
      <div class="delete-dialog-backdrop" @click=${this.handleDeleteCancel}>
        <div class="delete-dialog" @click=${(e: Event) => { e.stopPropagation(); }}>
          <h3 class="delete-dialog-title">Excluir notas?</h3>
          <p class="delete-dialog-message">
            ${count} nota(s) ${scopeLabel} serão excluídas permanentemente.
          </p>
          <div class="delete-dialog-actions">
            <button class="btn btn-secondary" @click=${this.handleDeleteCancel}>
              Cancelar
            </button>
            <button class="btn btn-danger" @click=${this.handleDeleteConfirm}>
              Excluir
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dashboard-view': DashboardView;
  }
}
