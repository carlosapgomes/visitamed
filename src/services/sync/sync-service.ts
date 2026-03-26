/**
 * WardFlow Sync Service
 * Serviço de sincronização entre IndexedDB e Firestore
 *
 * TODO: Implementar sincronização completa na próxima fase
 */

import { db } from '@/services/db/dexie-db';
import type { Note } from '@/models/note';
import type { SyncQueueItem } from '@/models/sync-queue';
import { getFirebaseFirestore } from '@/services/auth/firebase';
import { SYNC_QUEUE_CONSTANTS } from '@/models/sync-queue';

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  error: string | null;
}

type SyncStatusCallback = (status: SyncStatus) => void;

let currentStatus: SyncStatus = {
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  error: null,
};

const subscribers = new Set<SyncStatusCallback>();

/**
 * Obtém o status atual de sincronização
 */
export function getSyncStatus(): SyncStatus {
  return { ...currentStatus };
}

/**
 * Subscribe para mudanças de status de sincronização
 */
export function subscribeToSync(callback: SyncStatusCallback): () => void {
  subscribers.add(callback);
  callback(currentStatus);
  return () => subscribers.delete(callback);
}

/**
 * Adiciona uma nota à fila de sincronização
 */
export async function queueNoteForSync(
  operation: 'create' | 'update' | 'delete',
  note: Note
): Promise<void> {
  const { createSyncQueueItem } = await import('@/models/sync-queue');
  const item = createSyncQueueItem(operation, 'note', note.id, note);
  await db.syncQueue.add(item);
  await updatePendingCount();
}

/**
 * Executa a sincronização pendente
 *
 * TODO: Implementar lógica completa de sync com Firestore
 */
export async function syncNow(): Promise<void> {
  const firestore = getFirebaseFirestore();

  if (!firestore) {
    console.warn('[WardFlow] Firestore não configurado');
    return;
  }

  if (currentStatus.isSyncing) {
    return;
  }

  currentStatus = { ...currentStatus, isSyncing: true, error: null };
  notifySubscribers();

  try {
    const pendingItems = await db.syncQueue.toArray();

    for (const item of pendingItems) {
      try {
        processSyncItem(item);
        await db.syncQueue.delete(item.id);
      } catch (error) {
        await handleSyncError(item, error);
      }
    }

    currentStatus = {
      isSyncing: false,
      pendingCount: 0,
      lastSyncAt: new Date(),
      error: null,
    };
  } catch (error) {
    currentStatus = {
      ...currentStatus,
      isSyncing: false,
      error: error instanceof Error ? error.message : 'Erro na sincronização',
    };
  }

  notifySubscribers();
}

/**
 * Processa um item da fila de sincronização
 *
 * TODO: Implementar escrita no Firestore
 */
function processSyncItem(_item: SyncQueueItem): void {
  // Placeholder - implementar na próxima fase
  console.log('[WardFlow] Processando sync item:', _item.id);
}

/**
 * Trata erros de sincronização
 */
async function handleSyncError(item: SyncQueueItem, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'Erro desconhecido';

  if (item.retryCount >= SYNC_QUEUE_CONSTANTS.MAX_RETRIES) {
    console.error('[WardFlow] Item excedeu máximo de tentativas:', item.id);
    await db.syncQueue.update(item.id, {
      error: message,
      lastAttemptAt: new Date(),
    });
    return;
  }

  await db.syncQueue.update(item.id, {
    retryCount: item.retryCount + 1,
    lastAttemptAt: new Date(),
    error: message,
  });
}

/**
 * Atualiza contador de itens pendentes
 */
async function updatePendingCount(): Promise<void> {
  const count = await db.syncQueue.count();
  currentStatus = { ...currentStatus, pendingCount: count };
  notifySubscribers();
}

/**
 * Notifica subscribers
 */
function notifySubscribers(): void {
  for (const callback of subscribers) {
    callback(currentStatus);
  }
}
