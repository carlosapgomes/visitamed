/**
 * WardFlow Notes Service
 * Serviço de persistência de notas
 */

import { db } from './dexie-db';
import { createNote, NOTE_CONSTANTS, type Note } from '@/models/note';
import { isNoteActive } from '@/utils/note-expiration';
import { getAuthState } from '@/services/auth/auth-service';

export interface CreateNoteInput {
  ward: string;
  bed: string;
  note: string;
  reference?: string;
}

/**
 * Obtém o ID do usuário atual ou lança erro se não autenticado
 */
function requireUserId(): string {
  const { user } = getAuthState();

  if (!user) {
    throw new Error('Usuário não autenticado. Faça login para criar notas.');
  }

  return user.uid;
}

/**
 * Cria e salva uma nova nota no banco local
 */
export async function saveNote(input: CreateNoteInput): Promise<Note> {
  const userId = requireUserId();

  const note = createNote({
    userId,
    ward: input.ward.trim(),
    bed: input.bed.trim(),
    note: input.note.trim(),
    reference: input.reference?.trim() ?? undefined,
  });

  await db.notes.add(note);
  return note;
}

/**
 * Busca todas as notas do usuário atual, não expiradas
 * Ordenadas por createdAt descendente (mais recentes primeiro)
 */
export async function getAllNotes(): Promise<Note[]> {
  const { user } = getAuthState();

  // Se não há usuário, retorna lista vazia
  if (!user) {
    return [];
  }

  const now = new Date();
  const notes = await db.notes
    .where('userId')
    .equals(user.uid)
    .filter((note) => isNoteActive(note, now))
    .reverse()
    .sortBy('createdAt');

  return notes;
}

/**
 * Busca uma nota pelo ID
 */
export async function getNoteById(noteId: string): Promise<Note | undefined> {
  return await db.notes.get(noteId);
}

/**
 * Valida se os campos obrigatórios estão preenchidos
 */
export function validateNoteInput(input: CreateNoteInput): boolean {
  return (
    input.ward.trim().length > 0 &&
    input.bed.trim().length > 0 &&
    input.note.trim().length > 0 &&
    input.note.length <= NOTE_CONSTANTS.MAX_NOTE_LENGTH
  );
}

/**
 * Deleta uma nota pelo ID
 */
export async function deleteNote(noteId: string): Promise<void> {
  await db.notes.delete(noteId);
}

/**
 * Deleta múltiplas notas por IDs
 */
export async function deleteNotes(noteIds: string[]): Promise<void> {
  await db.notes.bulkDelete(noteIds);
}

/**
 * Atualiza uma nota existente
 */
export async function updateNote(noteId: string, updates: Partial<Pick<Note, 'ward' | 'bed' | 'note' | 'reference'>>): Promise<void> {
  await db.notes.update(noteId, {
    ...updates,
    updatedAt: new Date(),
  });
}
