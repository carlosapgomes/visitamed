/**
 * VisitInvites Service
 * Serviço de persistência de convites de visitas
 * S11B: create/list/revoke migrados para Firestore remoto
 */

import { db } from './dexie-db';
import { doc, collection, setDoc, getDoc, getDocs, updateDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/services/auth/firebase';
import { createVisitInvite, isInviteActive, revokeInvite, type VisitInvite, type InviteRole, type CreateVisitInviteInput } from '@/models/visit-invite';
import { createVisitMember, type VisitMember } from '@/models/visit-member';
import { getAuthState } from '@/services/auth/auth-service';
import { getVisitMember, getCurrentUserVisitMember } from './visit-members-service';
import { canManageInvites } from '@/services/auth/visit-permissions';

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
 * Obtém instância do Firestore ou lança erro se não configurado
 */
function requireFirestore(): Firestore {
  const firestore = getFirebaseFirestore();
  if (!firestore) {
    throw new Error('Firestore não configurado. Configure as credenciais do Firebase em src/config/env.ts');
  }
  return firestore;
}

/**
 * Converte Date para Timestamp Firestore
 */
function dateToFirestoreTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Converte Timestamp Firestore para Date
 */
function firestoreTimestampToDate(timestamp: Timestamp | null | undefined): Date {
  if (!timestamp) {
    return new Date();
  }
  return timestamp.toDate();
}

/**
 * Serializa VisitInvite para persistência no Firestore
 * Converte campos Date para Timestamp
 */
function serializeVisitInviteForFirestore(invite: VisitInvite): Record<string, unknown> {
  return {
    id: invite.id,
    visitId: invite.visitId,
    createdByUserId: invite.createdByUserId,
    token: invite.token,
    role: invite.role,
    expiresAt: dateToFirestoreTimestamp(invite.expiresAt),
    createdAt: dateToFirestoreTimestamp(invite.createdAt),
    updatedAt: dateToFirestoreTimestamp(invite.updatedAt),
    revokedAt: invite.revokedAt ? dateToFirestoreTimestamp(invite.revokedAt) : null,
  };
}

/**
 * Deserializa convite do Firestore para modelo VisitInvite
 * Converte Timestamp para Date
 */
function deserializeVisitInviteFromFirestore(data: Record<string, unknown>): VisitInvite {
  return {
    id: data['id'] as string,
    visitId: data['visitId'] as string,
    createdByUserId: data['createdByUserId'] as string,
    token: data['token'] as string,
    role: data['role'] as InviteRole,
    expiresAt: firestoreTimestampToDate(data['expiresAt'] as Timestamp | null | undefined),
    createdAt: firestoreTimestampToDate(data['createdAt'] as Timestamp | null | undefined),
    updatedAt: firestoreTimestampToDate(data['updatedAt'] as Timestamp | null | undefined),
    revokedAt: data['revokedAt'] ? firestoreTimestampToDate(data['revokedAt'] as Timestamp | null | undefined) : undefined,
  };
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
 * Valida permissão de gerenciar convites (fail-fast)
 * Verifica membership local + canManageInvites
 */
async function validateCanManageInvites(visitId: string): Promise<void> {
  requireUserId();
  const currentMember = await getCurrentUserVisitMember(visitId);

  if (!currentMember) {
    throw new Error('Você não é membro desta visita.');
  }

  if (!canManageInvites(currentMember)) {
    throw new Error('Apenas o owner pode criar ou revogar convites.');
  }
}

/**
 * Cria um novo convite para uma visita (Firestore remoto)
 */
export async function createVisitInviteForVisit(input: CreateVisitInviteInputService): Promise<VisitInvite> {
  const createdByUserId = requireUserId();
  const firestore = requireFirestore();

  // Guard fail-fast: verificar permissão de owner
  await validateCanManageInvites(input.visitId);

  const createInput: CreateVisitInviteInput = {
    visitId: input.visitId,
    createdByUserId,
    role: input.role,
    expiresInHours: input.expiresInHours,
  };

  const invite = createVisitInvite(createInput);

  // Persiste no Firestore: /visits/{visitId}/invites/{inviteId}
  const inviteRef = doc(firestore, 'visits', input.visitId, 'invites', invite.id);
  await setDoc(inviteRef, serializeVisitInviteForFirestore(invite));

  return invite;
}

/**
 * Lista convites ativos de uma visita (não expirados e não revogados)
 * Busca no Firestore remoto: /visits/{visitId}/invites
 */
export async function listActiveVisitInvites(visitId: string): Promise<VisitInvite[]> {
  const firestore = requireFirestore();
  const now = new Date();

  // Busca todos os convites da visita no Firestore
  const invitesCollection = collection(firestore, 'visits', visitId, 'invites');
  const snapshot = await getDocs(invitesCollection);

  const invites: VisitInvite[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const invite = deserializeVisitInviteFromFirestore(data);
    // Filtra apenas convites ativos
    if (isInviteActive(invite, now)) {
      invites.push(invite);
    }
  });

  return invites;
}

/**
 * Busca um convite pelo token
 */
export async function findInviteByToken(token: string): Promise<VisitInvite | undefined> {
  return db.visitInvites.where('token').equals(token).first();
}

/**
 * Input para revogação de convite via serviço
 */
export interface RevokeVisitInviteInput {
  inviteId: string;
  visitId: string;
}

/**
 * Revoga um convite pelo ID (Firestore remoto)
 * Requer visitId para localizar o documento no Firestore
 */
export async function revokeVisitInvite(inviteId: string, visitId: string): Promise<VisitInvite | undefined> {
  const firestore = requireFirestore();

  // Guard fail-fast: verificar permissão de owner
  await validateCanManageInvites(visitId);

  // Busca o convite no Firestore
  const inviteRef = doc(firestore, 'visits', visitId, 'invites', inviteId);
  const snap = await getDoc(inviteRef);

  if (!snap.exists()) {
    return undefined;
  }

  const data = snap.data();
  const invite = deserializeVisitInviteFromFirestore(data);

  const revokedInvite = revokeInvite(invite);
  // O revokedInvite sempre terá revokedAt após revokeInvite()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const revokedAtDate = revokedInvite.revokedAt!;

  // Atualiza no Firestore
  await updateDoc(inviteRef, {
    revokedAt: dateToFirestoreTimestamp(revokedAtDate),
    updatedAt: dateToFirestoreTimestamp(revokedInvite.updatedAt),
  });

  return revokedInvite;
}

/**
 * Status possíveis ao aceitar um convite
 */
export type AcceptInviteStatus =
  | 'accepted'
  | 'already-member'
  | 'invite-not-found'
  | 'invite-expired'
  | 'invite-revoked'
  | 'access-revoked';

/**
 * Resultado de aceite de convite
 */
export interface AcceptInviteResult {
  status: AcceptInviteStatus;
  visitId?: string;
}

/**
 * Aceita um convite por token
 * Cria membership ativo quando válido
 * Convite é de uso múltiplo (não é deletado após aceite)
 */
export async function acceptVisitInviteByToken(token: string): Promise<AcceptInviteResult> {
  const userId = requireUserId();
  const now = new Date();

  // 1. Busca convite por token
  const invite = await findInviteByToken(token);

  // 2. Valida convite
  if (!invite) {
    return { status: 'invite-not-found' };
  }

  if (invite.revokedAt) {
    return { status: 'invite-revoked', visitId: invite.visitId };
  }

  if (isInviteActive(invite, now)) {
    // ainda ativo, mas precisa verificar expiração
    const expiresAt = new Date(invite.expiresAt);
    if (now > expiresAt) {
      return { status: 'invite-expired', visitId: invite.visitId };
    }
  } else {
    return { status: 'invite-expired', visitId: invite.visitId };
  }

  // 3. Verifica membership atual
  const existingMember = await getVisitMember(invite.visitId, userId);

  if (existingMember) {
    if (existingMember.status === 'active') {
      return { status: 'already-member', visitId: invite.visitId };
    }
    // status === 'removed'
    return { status: 'access-revoked', visitId: invite.visitId };
  }

  // 4. Cria membership ativo com role do convite
  const newMember: VisitMember = createVisitMember(invite.visitId, userId, invite.role);
  await db.visitMembers.put(newMember);

  return { status: 'accepted', visitId: invite.visitId };
}
