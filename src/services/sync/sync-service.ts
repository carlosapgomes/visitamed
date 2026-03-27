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
import { getAuthState } from '@/services/auth/auth-service';
import {
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  type DocumentData,
  type Firestore,
  type UpdateData,
} from 'firebase/firestore';
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

const SYNC_INTERVAL_MS = 60000;
let isSyncInitialized = false;
let onlineHandler: (() => void) | null = null;
let periodicSyncIntervalId: number | null = null;

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
 * Inicializa orquestração automática de sync
 */
export function initializeSync(): void {
  if (isSyncInitialized) {
    return;
  }

  isSyncInitialized = true;

  // Mantém contador consistente ao iniciar app
  void updatePendingCount();

  if (typeof window !== 'undefined') {
    onlineHandler = () => {
      void syncIfAuthenticated();
    };

    window.addEventListener('online', onlineHandler);

    periodicSyncIntervalId = window.setInterval(() => {
      void syncIfAuthenticated();
    }, SYNC_INTERVAL_MS);
  }
}

/**
 * Cleanup da orquestração automática de sync
 */
export function cleanupSync(): void {
  if (typeof window !== 'undefined' && onlineHandler) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }

  if (typeof window !== 'undefined' && periodicSyncIntervalId !== null) {
    window.clearInterval(periodicSyncIntervalId);
    periodicSyncIntervalId = null;
  }

  isSyncInitialized = false;
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
  const { user, loading } = getAuthState();

  if (loading || !user) {
    return;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

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

  let syncError: string | null = null;

  try {
    const pendingItems = (await db.syncQueue.toArray())
      .filter((item) => shouldProcessItemForCurrentUser(item, user.uid))
      .sort((a, b) => {
        const createdAtDiff = a.createdAt.getTime() - b.createdAt.getTime();

        if (createdAtDiff !== 0) {
          return createdAtDiff;
        }

        return a.id.localeCompare(b.id);
      });

    for (const item of pendingItems) {
      try {
        await processSyncItem(item, firestore);
        await db.syncQueue.delete(item.id);
      } catch (error) {
        await handleSyncError(item, error);
      }
    }
  } catch (error) {
    syncError = error instanceof Error ? error.message : 'Erro na sincronização';
  }

  const pendingCount = await db.syncQueue.count();

  currentStatus = {
    ...currentStatus,
    isSyncing: false,
    pendingCount,
    lastSyncAt: syncError ? currentStatus.lastSyncAt : new Date(),
    error: syncError,
  };

  notifySubscribers();
}

/**
 * Processa um item da fila de sincronização
 */
async function processSyncItem(item: SyncQueueItem, firestore: Firestore): Promise<void> {
  if (item.entityType !== 'note') {
    throw new Error(`Tipo de entidade não suportado: ${item.entityType}`);
  }

  const notePayload = parseNotePayload(item.payload);
  const noteData = notePayload as unknown as DocumentData;
  const noteRef = doc(firestore, 'users', notePayload.userId, 'notes', item.entityId);

  if (item.operation === 'create') {
    await setDoc(noteRef, noteData);
  }

  if (item.operation === 'update') {
    try {
      await updateDoc(noteRef, noteData as UpdateData<DocumentData>);
    } catch {
      await setDoc(noteRef, noteData, { merge: true });
    }
  }

  if (item.operation === 'delete') {
    await deleteDoc(noteRef);
  }

  if (item.operation !== 'delete') {
    await db.notes.update(item.entityId, {
      syncStatus: 'synced',
      syncedAt: new Date(),
    });
  }
}

/**
 * Trata erros de sincronização
 */
async function handleSyncError(item: SyncQueueItem, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'Erro desconhecido';
  const retryCount = item.retryCount + 1;
  const lastAttemptAt = new Date();

  if (retryCount >= SYNC_QUEUE_CONSTANTS.MAX_RETRIES) {
    console.error('[WardFlow] Item excedeu máximo de tentativas:', item.id);
    await db.syncQueue.update(item.id, {
      retryCount,
      error: message,
      lastAttemptAt,
    });

    if (item.entityType === 'note') {
      await db.notes.update(item.entityId, {
        syncStatus: 'failed',
      });
    }

    await db.syncQueue.delete(item.id);
    return;
  }

  await db.syncQueue.update(item.id, {
    retryCount,
    lastAttemptAt,
    error: message,
  });
}

/**
 * Verifica se item deve ser processado para o usuário autenticado atual
 */
function shouldProcessItemForCurrentUser(item: SyncQueueItem, currentUserId: string): boolean {
  try {
    const notePayload = parseNotePayload(item.payload);
    return notePayload.userId === currentUserId;
  } catch {
    // Payload inválido/não parseável deve continuar no fluxo
    // para entrar em retry e ser removido ao atingir erro terminal.
    return true;
  }
}

/**
 * Faz parse seguro do payload da fila
 */
function parseNotePayload(payload: string): Note {
  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(payload);
  } catch {
    throw new Error('Payload inválido na fila de sincronização');
  }

  if (!parsedPayload || typeof parsedPayload !== 'object') {
    throw new Error('Payload de nota inválido na fila de sincronização');
  }

  const notePayload = parsedPayload as Partial<Note>;

  if (typeof notePayload.userId !== 'string' || notePayload.userId.length === 0) {
    throw new Error('Payload de nota sem userId');
  }

  return notePayload as Note;
}

/**
 * Tenta sincronizar quando há usuário autenticado
 */
async function syncIfAuthenticated(): Promise<void> {
  const { user, loading } = getAuthState();

  if (loading || !user) {
    return;
  }

  await syncNow();
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
