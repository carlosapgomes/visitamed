/**
 * VisitInvites Service
 * Serviço de persistência de convites de visitas
 */

import { db } from './dexie-db';
import { createVisitInvite, isInviteActive, revokeInvite, type VisitInvite, type InviteRole, type CreateVisitInviteInput } from '@/models/visit-invite';
import { getAuthState } from '@/services/auth/auth-service';

/**
 * Obtém o ID do usuário atual ou lança erro se não autenticado
 */
function requireUserId(): string {
  const { user } = getAuthState();

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  return user.uid;
}

/**
 * Input para criação de convite via serviço
 */
export interface CreateVisitInviteInputService {
  visitId: string;
  role: InviteRole;
  expiresInHours?: number;
}

/**
 * Cria um novo convite para uma visita
 */
export async function createVisitInviteForVisit(input: CreateVisitInviteInputService): Promise<VisitInvite> {
  const createdByUserId = requireUserId();

  const createInput: CreateVisitInviteInput = {
    visitId: input.visitId,
    createdByUserId,
    role: input.role,
    expiresInHours: input.expiresInHours,
  };

  const invite = createVisitInvite(createInput);

  await db.visitInvites.put(invite);

  return invite;
}

/**
 * Lista convites ativos de uma visita (não expirados e não revogados)
 */
export async function listActiveVisitInvites(visitId: string): Promise<VisitInvite[]> {
  const now = new Date();

  const invites = await db.visitInvites.where('visitId').equals(visitId).toArray();

  return invites.filter((invite) => isInviteActive(invite, now));
}

/**
 * Busca um convite pelo token
 */
export async function findInviteByToken(token: string): Promise<VisitInvite | undefined> {
  return db.visitInvites.where('token').equals(token).first();
}

/**
 * Revoga um convite pelo ID
 */
export async function revokeVisitInvite(inviteId: string): Promise<VisitInvite | undefined> {
  const invite = await db.visitInvites.get(inviteId);

  if (!invite) {
    return undefined;
  }

  const revokedInvite = revokeInvite(invite);

  await db.visitInvites.put(revokedInvite);

  return revokedInvite;
}
