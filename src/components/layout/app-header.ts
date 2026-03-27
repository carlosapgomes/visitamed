/**
 * WardFlow App Header
 * Cabeçalho da aplicação com menu e usuário
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { subscribeToAuth, signOutUser, type AuthState } from '@/services/auth/auth-service';
import { navigate } from '@/router/router';

@customElement('app-header')
export class AppHeader extends LitElement {
  @property({ type: String }) override title = 'WardFlow';
  @state() private user: AuthState['user'] = null;
  @state() private showMenu = false;

  private unsubscribe: (() => void) | null = null;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: var(--z-sticky);
      background-color: var(--color-bg);
      border-bottom: 1px solid var(--color-border);
    }

    .header-wrapper {
      width: 100%;
      max-width: 768px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--header-height);
      padding: 0 var(--space-4);
      padding-top: var(--safe-area-inset-top);
    }

    .header-left,
    .header-right {
      display: flex;
      align-items: center;
      min-width: 48px;
    }

    .header-title {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      text-align: center;
      flex: 1;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      color: var(--color-text);
      background: none;
      border: none;
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }

    .icon-btn:hover {
      background-color: var(--color-surface);
    }

    .icon-btn:active {
      background-color: var(--color-border);
    }

    svg {
      width: 24px;
      height: 24px;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      background-color: var(--color-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      overflow: hidden;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .menu-container {
      position: relative;
    }

    .menu {
      position: absolute;
      top: calc(100% + var(--space-2));
      right: 0;
      min-width: 140px;
      background-color: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-dropdown);
    }

    .menu-item {
      display: block;
      width: 100%;
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-md);
      color: var(--color-text);
      background: none;
      border: none;
      text-align: left;
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }

    .menu-item:hover {
      background-color: var(--color-surface);
    }

    .menu-item:active {
      background-color: var(--color-border);
    }

    .menu-item.danger {
      color: var(--color-danger);
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = subscribeToAuth((state: AuthState) => {
      this.user = state.user;
    });

    // Fecha menu ao clicar fora
    document.addEventListener('click', this.handleOutsideClick);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    document.removeEventListener('click', this.handleOutsideClick);
  }

  private handleOutsideClick = (e: Event): void => {
    if (this.showMenu) {
      const target = e.target as HTMLElement;
      if (!this.shadowRoot?.contains(target)) {
        this.showMenu = false;
      }
    }
  };

  private handleMenuClick = (): void => {
    this.dispatchEvent(new CustomEvent('menu-click', { bubbles: true, composed: true }));
  };

  private handleUserClick = (e: Event): void => {
    e.stopPropagation();
    if (this.user) {
      this.showMenu = !this.showMenu;
    } else {
      this.dispatchEvent(new CustomEvent('user-click', { bubbles: true, composed: true }));
    }
  };

  private handleLogout = async (): Promise<void> => {
    this.showMenu = false;
    try {
      await signOutUser();
      navigate('/login', true);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  private getAvatarContent() {
    if (!this.user) return null;

    if (this.user.photoURL) {
      return html`<img src=${this.user.photoURL} alt="Avatar" />`;
    }

    const initial = this.user.displayName?.charAt(0).toUpperCase() ?? 'U';
    return initial;
  }

  override render() {
    return html`
      <div class="header-wrapper">
        <header class="header">
          <div class="header-left">
            <button class="icon-btn" @click=${this.handleMenuClick} aria-label="Menu">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <h1 class="header-title">${this.title}</h1>

          <div class="header-right">
            ${this.user
              ? html`
                  <div class="menu-container">
                    <div class="avatar" @click=${this.handleUserClick}>
                      ${this.getAvatarContent()}
                    </div>
                    ${this.showMenu
                      ? html`
                          <div class="menu">
                            <button class="menu-item danger" @click=${this.handleLogout}>
                              Sair
                            </button>
                          </div>
                        `
                      : null}
                  </div>
                `
              : html`
                  <button class="icon-btn" @click=${this.handleUserClick} aria-label="Usuário">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </button>
                `}
          </div>
        </header>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-header': AppHeader;
  }
}
