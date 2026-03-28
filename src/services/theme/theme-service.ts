/**
 * VisitaMed Theme Service
 * Gerencia preferência e aplicação de tema (claro/escuro)
 */

export type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'visitamed-theme';

function getSystemTheme(): AppTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme(): AppTheme | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' || stored === 'light' ? stored : null;
}

export function getResolvedTheme(): AppTheme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: AppTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

export function initializeTheme(): AppTheme {
  const theme = getResolvedTheme();
  applyTheme(theme);
  return theme;
}

export function toggleTheme(): AppTheme {
  const current = getResolvedTheme();
  const next: AppTheme = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_STORAGE_KEY, next);
  applyTheme(next);
  return next;
}
