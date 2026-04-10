/**
 * VisitaMed Visit Model
 * Modelo para visitas (conjuntos de notas de uma data)
 */

export interface Visit {
  /** ID único da visita (UUID) */
  id: string;

  /** ID do usuário que criou a visita */
  userId: string;

  /** Nome da visita */
  name: string;

  /** Data da visita (YYYY-MM-DD) */
  date: string;

  /** Modo da visita: privada ou em grupo */
  mode: 'private' | 'group';

  /** Timestamp de criação */
  createdAt: Date;

  /** Timestamp de expiração (padrão: 14 dias) */
  expiresAt: Date;

  /** Timestamp de atualização */
  updatedAt?: Date;
}

/**
 * Constantes relacionadas a visitas
 */
export const VISIT_CONSTANTS = {
  /** Tamanho máximo do nome */
  MAX_NAME_LENGTH: 100,

  /** Dias até expiração padrão */
  EXPIRATION_DAYS: 14,

  /** Padrão legado de nome privado automático (com data + "privada") */
  LEGACY_PRIVATE_NAME_REGEX:
    /^(?<base>.+?)\s+(?<date>(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4})\s+privada(?:\s+\((?<duplicate>[2-9]\d*)\))?$/u,
} as const;

/**
 * Gera nome base para novas visitas (sem metadata de data/mode)
 */
export function generatePrivateVisitName(prefix?: string): string {
  if (prefix?.trim()) {
    return prefix.trim();
  }

  return 'Visita';
}

/**
 * Gera data atual no formato YYYY-MM-DD
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

/**
 * Normaliza nomes privados legados gerados automaticamente pelo app antigo.
 * Ex.: "HMH 01-04-2026 privada (2)" -> "HMH"
 */
export function normalizeLegacyPrivateVisitName(name: string): string {
  const trimmedName = name.trim();
  const match = trimmedName.match(VISIT_CONSTANTS.LEGACY_PRIVATE_NAME_REGEX);

  const legacyBaseName = match?.groups?.['base'];

  if (!legacyBaseName) {
    return name;
  }

  const baseName = legacyBaseName.trim();
  return baseName.length > 0 ? baseName : name;
}

/**
 * Cria uma nova visita com valores padrão
 */
export function createVisit(partial: Partial<Visit>): Visit {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + VISIT_CONSTANTS.EXPIRATION_DAYS);

  return {
    id: crypto.randomUUID(),
    userId: '',
    name: '',
    date: getCurrentDate(),
    mode: 'private',
    createdAt: now,
    expiresAt,
    ...partial,
  };
}
