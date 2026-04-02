/**
 * VisitaMed Settings Model
 * Configurações do usuário
 */

export interface InputPreferences {
  /** Mantém Leito em maiúsculas automaticamente */
  uppercaseBed: boolean;
}

export interface Settings {
  /** ID único das configurações (sempre 'user-settings') */
  id: 'user-settings';

  /** ID do usuário */
  userId: string;

  /** Preferências de transformação de inputs */
  inputPreferences: InputPreferences;

  /** Timestamp da última atualização */
  updatedAt: Date;
}

export const SETTINGS_ID: Settings['id'] = 'user-settings';

export const DEFAULT_INPUT_PREFERENCES: InputPreferences = {
  uppercaseBed: true,
};

/**
 * Configurações padrão (sem userId)
 */
export const DEFAULT_SETTINGS: Omit<Settings, 'userId'> = {
  id: SETTINGS_ID,
  inputPreferences: { ...DEFAULT_INPUT_PREFERENCES },
  updatedAt: new Date(),
};

/**
 * Cria configurações para um novo usuário
 */
export function createSettings(userId: string): Settings {
  return {
    ...DEFAULT_SETTINGS,
    inputPreferences: { ...DEFAULT_INPUT_PREFERENCES },
    userId,
    updatedAt: new Date(),
  };
}

function normalizeUpdatedAt(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    const timestampLike = value as { toDate?: () => Date };
    if (typeof timestampLike.toDate === 'function') {
      const converted = timestampLike.toDate();
      if (!Number.isNaN(converted.getTime())) {
        return converted;
      }
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function normalizeInputPreferences(value: unknown): InputPreferences {
  const raw = value as Partial<InputPreferences> | undefined;

  return {
    uppercaseBed: raw?.uppercaseBed ?? DEFAULT_INPUT_PREFERENCES.uppercaseBed,
  };
}

/**
 * Normaliza payload parcial/legado para o shape atual de Settings
 */
export function normalizeSettings(raw: unknown, userId: string): Settings {
  const rawObj = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>;

  return {
    id: SETTINGS_ID,
    userId,
    inputPreferences: normalizeInputPreferences(rawObj.inputPreferences),
    updatedAt: normalizeUpdatedAt(rawObj.updatedAt),
  };
}
