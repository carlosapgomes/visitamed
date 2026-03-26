/**
 * WardFlow Note Expiration Utility
 * Funções puras para verificar expiração de notas
 */

import type { Note } from '@/models/note';

/**
 * Verifica se uma nota está ativa (não expirada)
 *
 * Uma nota está ativa se: expiresAt > now
 * Uma nota está expirada se: expiresAt <= now
 *
 * @param note Nota a verificar
 * @param now Data/hora atual (padrão: new Date())
 * @returns true se a nota está ativa, false se expirada
 */
export function isNoteActive(note: Note, now: Date = new Date()): boolean {
  return note.expiresAt > now;
}

/**
 * Filtra apenas notas ativas (não expiradas)
 *
 * @param notes Lista de notas
 * @param now Data/hora atual (padrão: new Date())
 * @returns Lista contendo apenas notas ativas
 */
export function filterActiveNotes(notes: Note[], now: Date = new Date()): Note[] {
  return notes.filter((note) => isNoteActive(note, now));
}
