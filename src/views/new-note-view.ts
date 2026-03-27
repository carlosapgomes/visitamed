/**
 * WardFlow New/Edit Note View
 * Tela para criar ou editar uma nota
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { navigate, getCurrentRoute } from '@/router/router';
import { saveNote, updateNote, getNoteById, validateNoteInput, type CreateNoteInput } from '@/services/db/notes-service';
import { NOTE_CONSTANTS } from '@/models/note';

@customElement('new-note-view')
export class NewNoteView extends LitElement {
  @state() private noteId: string | null = null;
  @state() private ward = '';
  @state() private bed = '';
  @state() private reference = '';
  @state() private note = '';
  @state() private saving = false;
  @state() private loading = false;
  @state() private error = '';

  private get isEditMode(): boolean {
    return this.noteId !== null;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .form-container {
      flex: 1;
      padding: var(--space-5);
      padding-top: calc(var(--header-height) + var(--space-5));
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
      overflow-y: auto;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    label {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
    }

    input,
    textarea {
      padding: var(--space-4);
      font-size: var(--font-md);
      font-family: inherit;
      background-color: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    input:focus,
    textarea:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    input::placeholder,
    textarea::placeholder {
      color: var(--color-muted);
      opacity: 0.7;
    }

    textarea {
      min-height: 160px;
      resize: vertical;
      line-height: var(--line-height-relaxed);
    }

    .char-count {
      font-size: var(--font-xs);
      color: var(--color-muted);
      text-align: right;
      margin-top: var(--space-1);
    }

    .actions {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      padding-bottom: calc(var(--space-4) + var(--safe-area-inset-bottom));
      border-top: 1px solid var(--color-border);
      background-color: var(--color-bg);
    }

    .btn {
      flex: 1;
      padding: var(--space-4);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      font-family: inherit;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background-color var(--transition-fast), border-color var(--transition-fast);
    }

    .btn-secondary {
      background-color: var(--color-bg);
      color: var(--color-text);
      border: 1px solid var(--color-border);
    }

    .btn-secondary:hover {
      background-color: var(--color-surface);
      border-color: var(--color-muted);
    }

    .btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background-color: var(--color-primary);
      color: white;
      border: none;
    }

    .btn-primary:hover {
      background-color: var(--color-primary-pressed);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error-message {
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-sm);
      color: var(--color-danger);
      background-color: var(--color-danger-light);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-danger);
    }

    .loading-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-muted);
      font-size: var(--font-md);
    }
  `;

  override async connectedCallback(): Promise<void> {
    super.connectedCallback();

    // Verifica se há um ID na rota (modo edição)
    const route = getCurrentRoute();
    if (route?.params['id']) {
      this.noteId = route.params['id'];
      await this.loadNote();
    }
  }

  private async loadNote(): Promise<void> {
    if (!this.noteId) return;

    try {
      this.loading = true;
      const existingNote = await getNoteById(this.noteId);

      if (existingNote) {
        this.ward = existingNote.ward;
        this.bed = existingNote.bed;
        this.reference = existingNote.reference ?? '';
        this.note = existingNote.note;
      } else {
        this.error = 'Nota não encontrada';
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Erro ao carregar nota';
    } finally {
      this.loading = false;
    }
  }

  private handleWardInput = (e: Event) => {
    this.ward = (e.target as HTMLInputElement).value;
  };

  private handleBedInput = (e: Event) => {
    this.bed = (e.target as HTMLInputElement).value;
  };

  private handleReferenceInput = (e: Event) => {
    this.reference = (e.target as HTMLInputElement).value;
  };

  private handleNoteInput = (e: Event) => {
    this.note = (e.target as HTMLTextAreaElement).value;
  };

  private handleSave = async () => {
    const input: CreateNoteInput = {
      ward: this.ward,
      bed: this.bed,
      reference: this.reference || undefined,
      note: this.note,
    };

    if (!validateNoteInput(input)) {
      this.error = 'Preencha os campos obrigatórios: Ala, Leito e Nota';
      return;
    }

    this.saving = true;
    this.error = '';

    try {
      if (this.isEditMode && this.noteId) {
        await updateNote(this.noteId, input);
      } else {
        await saveNote(input);
      }
      navigate('/dashboard');
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Erro ao salvar nota';
    } finally {
      this.saving = false;
    }
  };

  private handleCancel = () => {
    navigate('/dashboard');
  };

  override render() {
    const canSave = !this.saving && this.ward && this.bed && this.note;
    const title = this.isEditMode ? 'Editar Nota' : 'Nova Nota';
    const saveLabel = this.saving ? 'Salvando...' : 'Salvar';

    if (this.loading) {
      return html`
        <app-header title=${title}></app-header>
        <div class="loading-container">Carregando...</div>
      `;
    }

    return html`
      <app-header title=${title}></app-header>

      <div class="form-container">
        <div class="form-group">
          <label for="ward">Ala / Setor *</label>
          <input
            id="ward"
            type="text"
            .value=${this.ward}
            @input=${this.handleWardInput}
            placeholder="Ex: UTI, Enfermaria A"
            autocomplete="off"
          />
        </div>

        <div class="form-group">
          <label for="bed">Leito *</label>
          <input
            id="bed"
            type="text"
            .value=${this.bed}
            @input=${this.handleBedInput}
            placeholder="Ex: 01, 02A"
            autocomplete="off"
          />
        </div>

        <div class="form-group">
          <label for="reference">Referência (opcional)</label>
          <input
            id="reference"
            type="text"
            .value=${this.reference}
            @input=${this.handleReferenceInput}
            placeholder="Ex: AB, iniciais"
            maxlength=${NOTE_CONSTANTS.MAX_REFERENCE_LENGTH}
          />
        </div>

        <div class="form-group">
          <label for="note">Nota *</label>
          <textarea
            id="note"
            .value=${this.note}
            @input=${this.handleNoteInput}
            placeholder="Digite a nota clínica..."
            maxlength=${NOTE_CONSTANTS.MAX_NOTE_LENGTH}
          ></textarea>
          <span class="char-count">${this.note.length}/${NOTE_CONSTANTS.MAX_NOTE_LENGTH}</span>
        </div>

        ${this.error ? html`<div class="error-message">${this.error}</div>` : null}
      </div>

      <div class="actions">
        <button class="btn btn-secondary" @click=${this.handleCancel} ?disabled=${this.saving}>
          Cancelar
        </button>
        <button class="btn btn-primary" @click=${this.handleSave} ?disabled=${!canSave}>
          ${saveLabel}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'new-note-view': NewNoteView;
  }
}
