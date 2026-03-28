/**
 * VisitaMed Settings Model
 * Configurações do usuário
 */

export interface Settings {
  /** ID único das configurações (sempre 'user-settings') */
  id: 'user-settings';

  /** ID do usuário */
  userId: string;

  /** Tema da aplicação */
  theme: 'light' | 'dark' | 'system';

  /** Lista de alas favoritas/usadas */
  wards: string[];

  /** Configurações de exportação */
  exportConfig: ExportConfig;

  /** Timestamp da última atualização */
  updatedAt: Date;
}

export interface ExportConfig {
  /** Formato de exportação padrão */
  format: 'text' | 'markdown' | 'json';

  /** Incluir referência na exportação */
  includeReference: boolean;

  /** Template customizado de exportação */
  customTemplate?: string;
}

/**
 * Configurações padrão
 */
export const DEFAULT_SETTINGS: Omit<Settings, 'userId'> = {
  id: 'user-settings',
  theme: 'system',
  wards: [],
  exportConfig: {
    format: 'text',
    includeReference: true,
  },
  updatedAt: new Date(),
};

/**
 * Cria configurações para um novo usuário
 */
export function createSettings(userId: string): Settings {
  return {
    ...DEFAULT_SETTINGS,
    userId,
    updatedAt: new Date(),
  };
}
