/**
 * VisitInvite Model
 * Modelo para convites de visitas colaborativas
 */

/**
 * Papéis possíveis para um convite de visita
 */
export type InviteRole = 'editor' | 'viewer';

/**
 * Representa um convite para participar de uma visita colaborativa
 */
export interface VisitInvite {
  /** ID único do convite */
  id: string;

  /** ID da visita */
  visitId: string;

  /** ID do usuário que criou o convite */
  createdByUserId: string;

  /** Token aleatório para o link de convite */
  token: string;

  /** Papel do convidado na visita */
  role: InviteRole;

  /** Data de expiração do convite */
  expiresAt: Date;

  /** Data de criação */
  createdAt: Date;

  /** Data de última atualização */
  updatedAt: Date;

  /** Data de revogação (se aplicável) */
  revokedAt?: Date;
}

/**
 * Input para criação de convite
 */
export interface CreateVisitInviteInput {
  visitId: string;
  createdByUserId: string;
  role: InviteRole;
  expiresInHours?: number;
}

/**
 * Constante: tempo padrão de expiração em horas
 */
const DEFAULT_EXPIRATION_HOURS = 24;

/**
 * Cria um novo VisitInvite com valores padrão
 */
export function createVisitInvite(input: CreateVisitInviteInput): VisitInvite {
  const now = new Date();
  const expiresInHours = input.expiresInHours ?? DEFAULT_EXPIRATION_HOURS;
  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

  const token = crypto.randomUUID();
  const id = token;

  return {
    id,
    visitId: input.visitId,
    createdByUserId: input.createdByUserId,
    token,
    role: input.role,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Verifica se um convite está expirado
 */
export function isInviteExpired(invite: VisitInvite, now = new Date()): boolean {
  return now >= invite.expiresAt;
}

/**
 * Verifica se um convite foi revogado
 */
export function isInviteRevoked(invite: VisitInvite): boolean {
  return invite.revokedAt !== undefined;
}

/**
 * Verifica se um convite está ativo (não expirado e não revogado)
 */
export function isInviteActive(invite: VisitInvite, now = new Date()): boolean {
  return !isInviteExpired(invite, now) && !isInviteRevoked(invite);
}

/**
 * Revoga um convite, retornando um novo objeto com revokedAt
 */
export function revokeInvite(invite: VisitInvite, at = new Date()): VisitInvite {
  return {
    ...invite,
    revokedAt: at,
    updatedAt: at,
  };
}
