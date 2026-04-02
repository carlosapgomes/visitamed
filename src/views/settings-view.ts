/**
 * VisitaMed Settings View
 * Tela de configurações do usuário (tags-first)
 */

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { navigate } from '@/router/router';
import {
  getUserSettings,
  updateInputPreferences,
} from '@/services/settings/settings-service';

@customElement('settings-view')
export class SettingsView extends LitElement {
  @state() private loading = true;
  @state() private saving = false;
  @state() private error = '';

  @state() private uppercaseBed = true;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      this.loading = true;
      this.error = '';

      const settings = await getUserSettings();
      this.uppercaseBed = settings.inputPreferences.uppercaseBed;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Erro ao carregar configurações';
    } finally {
      this.loading = false;
    }
  }

// Removido: handleUppercaseWardChange (tags-first)

  private handleUppercaseBedChange = async (e: Event): Promise<void> => {
    const checked = (e.target as HTMLInputElement).checked;
    const previous = this.uppercaseBed;
    this.uppercaseBed = checked;

    try {
      await updateInputPreferences({ uppercaseBed: checked });
    } catch (err) {
      this.uppercaseBed = previous;
      this.error = err instanceof Error ? err.message : 'Erro ao salvar configuração';
    }
  };

// Removido: UI de alas (tags-first)

  private handleBackToDashboard = (): void => {
    navigate('/dashboard');
  };

  override render() {
    if (this.loading) {
      return html`
        <app-header title="Configurações"></app-header>
        <main class="container-fluid wf-page-container wf-with-header pb-4">
          <div class="d-flex align-items-center justify-content-center text-secondary" style="min-height: 50vh;">
            Carregando...
          </div>
        </main>
      `;
    }

    return html`
      <app-header title="Configurações"></app-header>

      <main class="container-fluid wf-page-container wf-with-header pb-4">
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <h2 class="h6 mb-3">Entrada de texto</h2>

            <div class="form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                id="uppercase-bed"
                .checked=${this.uppercaseBed}
                @change=${this.handleUppercaseBedChange}
                ?disabled=${this.saving}
              />
              <label class="form-check-label" for="uppercase-bed">
                Leito em maiúsculas automaticamente
              </label>
              <div class="text-secondary small mt-1">
                Quando ativo, o campo Leito é convertido para maiúsculas ao digitar.
              </div>
            </div>
          </div>
        </div>

        ${this.error ? html`<div class="alert alert-danger py-2 px-3" role="alert">${this.error}</div>` : null}
      </main>

      <div class="wf-action-bar">
        <div class="container-fluid wf-page-container d-grid d-sm-flex justify-content-end">
          <button type="button" class="btn btn-outline-secondary" @click=${this.handleBackToDashboard} ?disabled=${this.saving}>
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-view': SettingsView;
  }
}
