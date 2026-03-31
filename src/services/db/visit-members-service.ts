/**
 * Visit Members Service
 * Serviço de persistência de membros de visitas
 */

import { db } from './dexie-db';
import { createVisitMember, type VisitMember } from '@/models/visit-member';
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
 * Salva ou atualiza um membro de visita
 */
export async function upsertVisitMember(member: VisitMember): Promise<void> {
  await db.visitMembers.put(member);
}

/**
 * Busca um membro específico de uma visita
 */
export async function getVisitMember(visitId: string, userId: string): Promise<VisitMember | undefined> {
  const memberId = `${visitId}:${userId}`;
  return db.visitMembers.get(memberId);
}

/**
 * Busca o membro atual (usuário logado) de uma visita
 */
export async function getCurrentUserVisitMember(visitId: string): Promise<VisitMember | undefined> {
  const userId = requireUserId();
  return getVisitMember(visitId, userId);
}

/**
 * Lista todos os membros ativos de uma visita
 */
export async function listVisitMembers(visitId: string): Promise<VisitMember[]> {
  return db.visitMembers.where('visitId').equals(visitId).toArray();
}

/**
 * Cria o membership do owner ao criar uma visita privada
 * Usado em transação atômica com a criação da visita
 */
export function createOwnerVisitMember(visitId: string, userId: string): VisitMember {
  return createVisitMember(visitId, userId, 'owner');
}
