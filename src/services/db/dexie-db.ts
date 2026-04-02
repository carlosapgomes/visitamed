/**
 * VisitaMed Dexie Database
 * Configuração do IndexedDB com Dexie
 */

import Dexie, { type EntityTable } from 'dexie';
import type { Note } from '@/models/note';
import type { Settings } from '@/models/settings';
import type { SyncQueueItem } from '@/models/sync-queue';
import type { Visit } from '@/models/visit';
import type { VisitMember } from '@/models/visit-member';
import type { VisitInvite } from '@/models/visit-invite';

/**
 * Classe principal do banco de dados
 */
class VisitaMedDB extends Dexie {
  notes!: EntityTable<Note, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
  visits!: EntityTable<Visit, 'id'>;
  visitMembers!: EntityTable<VisitMember, 'id'>;
  visitInvites!: EntityTable<VisitInvite, 'id'>;

  constructor() {
    super('VisitaMedDB');

    // v7: Remove wardStats table e índices, tags-first
    this.version(7)
      .stores({
        // Tags-first: remove índice ward
        notes: 'id, userId, visitId, date, syncStatus, expiresAt',
        settings: 'id, userId',
        syncQueue: 'id, userId, entityType, entityId, createdAt',
        visits: 'id, userId, date',
        visitMembers: 'id, visitId, userId, role, status, updatedAt',
        visitInvites: 'id, visitId, createdByUserId, token, role, expiresAt, createdAt, revokedAt',
      })
      .upgrade(async (tx) => {
        // Remover tabela wardStats legada se existir
        try {
          await tx.table('wardStats').clear();
        } catch {
          // Tabela não existe, ignorado
        }
        // Limpa syncQueue para iniciar limpo
        await tx.table('syncQueue').clear();
      });
  }
}

export const db = new VisitaMedDB();

/**
 * Limpa dados locais do usuário
 * Usado no logout para evitar dados órfãos em dispositivo compartilhado
 */
export async function clearLocalUserData(): Promise<void> {
  await db.transaction('rw', [db.notes, db.settings, db.syncQueue, db.visits, db.visitMembers, db.visitInvites], async () => {
    await db.notes.clear();
    await db.settings.clear();
    await db.syncQueue.clear();
    await db.visits.clear();
    await db.visitMembers.clear();
    await db.visitInvites.clear();
  });
}

/**
 * Limpa notas expiradas do banco local
 */
export async function cleanExpiredNotes(): Promise<number> {
  const now = new Date();
  const expiredCount = await db.notes.where('expiresAt').below(now).delete();
  return expiredCount;
}

/**
 * Obtém notas do usuário agrupadas por data
 */
export async function getNotesByDate(userId: string): Promise<Map<string, Note[]>> {
  const notes = await db.notes.where('userId').equals(userId).reverse().sortBy('date');

  const grouped = new Map<string, Note[]>();
  for (const note of notes) {
    const existing = grouped.get(note.date) ?? [];
    existing.push(note);
    grouped.set(note.date, existing);
  }

  return grouped;
}

// removido: getNotesByWard (tags-first agora)
