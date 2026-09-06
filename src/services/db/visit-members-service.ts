/**
 * Visit Members Service
 * Serviço de persistência e gerência de membros de visitas
 */

import { db } from './dexie-db';
import { canManageMembers } from '@/services/auth/visit-permissions';
import {
  createVisitMember,
  type MemberStatus,
  type VisitMember,
  type VisitRole,
} from '@/models/visit-member';
import { getAuthState } from '@/services/auth/auth-service';
import { getFirebaseFirestore } from '@/services/auth/firebase';
import { collection, doc, getDocs, updateDoc, type Firestore } from 'firebase/firestore';

/**
 * Status retornado pela operação de remoção de membro
 */
export type RemoveVisitMemberStatus =
  | 'removed'
  | 'forbidden'
  | 'target-not-found'
  | 'cannot-remove-owner'
  | 'cannot-remove-self';

/**
 * Resultado da operação de remoção de membro
 */
export interface RemoveVisitMemberResult {
  status: RemoveVisitMemberStatus;
  visitId: string;
  targetUserId: string;
}

/**
 * Papel atribuível por owner/admin a outro membro (owner não é atribuível)
 */
export type AssignableVisitRole = 'admin' | 'editor' | 'viewer';

/**
 * Status retornado pela operação de atualização de papel de membro
 */
export type UpdateVisitMemberRoleStatus =
  | 'updated'
  | 'forbidden'
  | 'target-not-found'
  | 'cannot-update-owner'
  | 'cannot-update-self';

/**
 * Resultado da operação de atualização de papel de membro
 */
export interface UpdateVisitMemberRoleResult {
  status: UpdateVisitMemberRoleStatus;
  visitId: string;
  targetUserId: string;
  /** Papel atribuído — presente quando status === 'updated' */
  role?: AssignableVisitRole;
  /** Membro local atualizado — presente quando status === 'updated' */
  member?: VisitMember;
}

/**
 * Dados de um doc remoto da subcoleção visits/{visitId}/members.
 * O doc id remoto é apenas o userId.
 */
interface FirestoreMemberData {
  userId?: string;
  role: VisitRole;
  status: MemberStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
  removedAt?: unknown;
  displayName?: string;
}

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
 * Converte timestamp do Firestore para Date JavaScript
 * Trata diferentes formatos: Timestamp, string, número ou Date
 */
function convertTimestampToDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }

  // Firebase Timestamp (tem método toDate)
  if (typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }

  // String ISO
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }

  // Número (unix timestamp em milissegundos)
  if (typeof value === 'number') {
    return new Date(value);
  }

  // Já é Date
  if (value instanceof Date) {
    return value;
  }

  return undefined;
}

/**
 * Converte um doc da subcoleção members para o formato local.
 * O id remoto do doc é apenas o userId; o id canônico local é "visitId:userId".
 */
function convertFirestoreMemberDocToLocal(
  visitId: string,
  docId: string,
  data: FirestoreMemberData
): VisitMember {
  const userId = data.userId ?? docId;
  const createdAt = convertTimestampToDate(data.createdAt) ?? new Date();
  const updatedAt = convertTimestampToDate(data.updatedAt) ?? createdAt;
  const removedAt = convertTimestampToDate(data.removedAt);

  return {
    id: `${visitId}:${userId}`,
    visitId,
    userId,
    role: data.role,
    status: data.status,
    createdAt,
    updatedAt,
    ...(removedAt && { removedAt }),
    ...(data.displayName && { displayName: data.displayName }),
  };
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
 * Lista todos os membros de uma visita (ativos e removidos)
 */
export async function listVisitMembers(visitId: string): Promise<VisitMember[]> {
  return db.visitMembers.where('visitId').equals(visitId).toArray();
}

/**
 * Cria o membership do owner ao criar uma visita privada.
 * Usado em transação atômica com a criação da visita.
 * Carimba o displayName do perfil autenticado (trim; ausente/vazio ⇒ omitido).
 */
export function createOwnerVisitMember(visitId: string, userId: string): VisitMember {
  const member = createVisitMember(visitId, userId, 'owner');

  const displayName = getAuthState().user?.displayName?.trim();

  if (displayName) {
    member.displayName = displayName;
  }

  return member;
}

/**
 * Self-heal best-effort do displayName do usuário atual durante a listagem.
 * Quando o membership do usuário atual está sem nome e o perfil autenticado
 * tem nome, grava { displayName, updatedAt } no doc remoto do próprio membro.
 * Owner pode auto-atualizar o próprio doc; não-owner é negado pelas rules
 * (falha engolida — caso teórico, pois não-owners recebem nome no aceite).
 */
async function healCurrentUserDisplayName(
  firestore: Firestore,
  visitId: string,
  members: VisitMember[]
): Promise<void> {
  const { user } = getAuthState();

  if (!user) {
    return;
  }

  const profileDisplayName = user.displayName?.trim();

  if (!profileDisplayName) {
    return;
  }

  const selfMember = members.find(
    (member) => member.userId === user.uid && !member.displayName
  );

  if (!selfMember) {
    return;
  }

  try {
    await updateDoc(doc(firestore, 'visits', visitId, 'members', user.uid), {
      displayName: profileDisplayName,
      updatedAt: new Date(),
    });

    selfMember.displayName = profileDisplayName;
  } catch (error) {
    console.warn(
      `[VisitaMed] Falha ao gravar displayName do membership de ${user.uid} na visita ${visitId} (self-heal best-effort):`,
      error
    );
  }
}

/**
 * Busca os membros da visita direto do Firestore (subcoleção members) e
 * atualiza o cache Dexie local com a lista convertida.
 * Owner/admin conseguem listar todos os membros; outros papéis são negados
 * pelas regras do Firestore. Erros de rede/Firestore propagam (throw).
 * @param visitId - ID da visita
 * @returns Lista de membros com id canônico "visitId:userId"
 */
export async function fetchVisitMembersFromRemote(visitId: string): Promise<VisitMember[]> {
  const firestore = getFirebaseFirestore();

  if (!firestore) {
    throw new Error('Firestore não configurado.');
  }

  const membersCollection = collection(firestore, 'visits', visitId, 'members');
  const membersSnapshot = await getDocs(membersCollection);

  const members = membersSnapshot.docs.map((docSnap) =>
    convertFirestoreMemberDocToLocal(
      visitId,
      docSnap.id,
      docSnap.data() as FirestoreMemberData
    )
  );

  if (members.length > 0) {
    await healCurrentUserDisplayName(firestore, visitId, members);

    await db.visitMembers.bulkPut(members);
  }

  return members;
}

/**
 * POST autenticado para os endpoints de gerência de membros.
 * Mesmo mecanismo de /api/visits/leave: Bearer idToken + fetch.
 */
async function postMemberManagementEndpoint(path: string, body: unknown): Promise<Response> {
  const { user } = getAuthState();

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const idToken = await user.getIdToken();

  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
}

interface RemoveMemberEndpointResponse {
  status: 'removed';
  visitId: string;
  targetUserId: string;
}

/**
 * Owner/admin remove um membro de uma visita colaborativa via endpoint remoto
 * (substitui o fluxo local-only de remoção: o estado removido é gravado no
 * servidor e o cache local é atualizado após confirmação).
 * @param visitId - ID da visita
 * @param targetUserId - ID do usuário a ser removido
 * @returns Resultado da operação
 */
export async function removeVisitMemberAsAdmin(
  visitId: string,
  targetUserId: string
): Promise<RemoveVisitMemberResult> {
  const { user } = getAuthState();

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const currentUserId = user.uid;

  // Gate local de gerência (evita roundtrip inútil ao endpoint)
  const currentMember = await getVisitMember(visitId, currentUserId);

  if (!currentMember || !canManageMembers(currentMember)) {
    return { status: 'forbidden', visitId, targetUserId };
  }

  if (targetUserId === currentUserId) {
    return { status: 'cannot-remove-self', visitId, targetUserId };
  }

  const targetMember = await getVisitMember(visitId, targetUserId);

  if (!targetMember) {
    return { status: 'target-not-found', visitId, targetUserId };
  }

  if (targetMember.role === 'owner') {
    return { status: 'cannot-remove-owner', visitId, targetUserId };
  }

  const response = await postMemberManagementEndpoint('/api/visits/members/remove', {
    visitId,
    targetUserId,
  });

  if (response.status === 401) {
    throw new Error('Usuário não autenticado.');
  }

  if (response.status === 400) {
    throw new Error('Requisição inválida.');
  }

  if (response.status === 403) {
    return { status: 'forbidden', visitId, targetUserId };
  }

  if (response.status === 404) {
    return { status: 'target-not-found', visitId, targetUserId };
  }

  if (response.status >= 500) {
    throw new Error('Erro no servidor.');
  }

  const result = await response.json() as unknown;

  if (!result || typeof result !== 'object') {
    throw new Error('Resposta inválida do servidor.');
  }

  const resultObj = result as Partial<RemoveMemberEndpointResponse>;

  if (
    resultObj.status !== 'removed' ||
    resultObj.visitId !== visitId ||
    resultObj.targetUserId !== targetUserId
  ) {
    throw new Error('Resposta inválida do servidor.');
  }

  const now = new Date();
  const updatedMember: VisitMember = {
    ...targetMember,
    status: 'removed',
    removedAt: now,
    updatedAt: now,
  };

  await db.visitMembers.put(updatedMember);

  return { status: 'removed', visitId, targetUserId };
}

interface UpdateMemberRoleEndpointResponse {
  status: 'updated';
  visitId: string;
  targetUserId: string;
  role: AssignableVisitRole;
}

/**
 * Owner/admin altera o papel de um membro de uma visita colaborativa via
 * endpoint remoto. Owner não é papel atribuível.
 * @param visitId - ID da visita
 * @param targetUserId - ID do usuário alvo
 * @param newRole - Novo papel (admin, editor ou viewer)
 * @returns Resultado da operação; member presente quando status === 'updated'
 */
export async function updateVisitMemberRole(
  visitId: string,
  targetUserId: string,
  newRole: AssignableVisitRole
): Promise<UpdateVisitMemberRoleResult> {
  const { user } = getAuthState();

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const currentUserId = user.uid;

  // Gate local de gerência (evita roundtrip inútil ao endpoint)
  const currentMember = await getVisitMember(visitId, currentUserId);

  if (!currentMember || !canManageMembers(currentMember)) {
    return { status: 'forbidden', visitId, targetUserId };
  }

  if (targetUserId === currentUserId) {
    return { status: 'cannot-update-self', visitId, targetUserId };
  }

  const targetMember = await getVisitMember(visitId, targetUserId);

  if (!targetMember) {
    return { status: 'target-not-found', visitId, targetUserId };
  }

  if (targetMember.role === 'owner') {
    return { status: 'cannot-update-owner', visitId, targetUserId };
  }

  const response = await postMemberManagementEndpoint('/api/visits/members/role', {
    visitId,
    targetUserId,
    role: newRole,
  });

  if (response.status === 401) {
    throw new Error('Usuário não autenticado.');
  }

  if (response.status === 400) {
    throw new Error('Requisição inválida.');
  }

  if (response.status === 403) {
    return { status: 'forbidden', visitId, targetUserId };
  }

  if (response.status === 404) {
    return { status: 'target-not-found', visitId, targetUserId };
  }

  if (response.status >= 500) {
    throw new Error('Erro no servidor.');
  }

  const result = await response.json() as unknown;

  if (!result || typeof result !== 'object') {
    throw new Error('Resposta inválida do servidor.');
  }

  const resultObj = result as Partial<UpdateMemberRoleEndpointResponse>;

  if (
    resultObj.status !== 'updated' ||
    resultObj.visitId !== visitId ||
    resultObj.targetUserId !== targetUserId ||
    resultObj.role !== newRole
  ) {
    throw new Error('Resposta inválida do servidor.');
  }

  const now = new Date();
  const updatedMember: VisitMember = {
    ...targetMember,
    role: newRole,
    updatedAt: now,
  };

  await db.visitMembers.put(updatedMember);

  return {
    status: 'updated',
    visitId,
    targetUserId,
    role: newRole,
    member: updatedMember,
  };
}
