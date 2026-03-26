/**
 * WardFlow Group Notes Utility
 * Função pura para agrupar notas por data e ala
 */

import type { Note } from '@/models/note';

/**
 * Estrutura de notas agrupadas por data e ala
 */
export interface GroupedNotes {
  date: string;
  wards: {
    ward: string;
    notes: Note[];
  }[];
}

/**
 * Agrupa notas por data e, dentro de cada data, por ala/setor.
 *
 * Ordenação:
 * - Datas: mais recentes primeiro
 * - Wards: ordem alfabética crescente
 * - Notas dentro de cada ward: mais recentes primeiro (por createdAt)
 *
 * @param notes Lista de notas a agrupar
 * @returns Array de grupos de notas por data e ward
 */
export function groupNotesByDateAndWard(notes: Note[]): GroupedNotes[] {
  if (notes.length === 0) {
    return [];
  }

  // Agrupar por data
  const byDate = new Map<string, Note[]>();

  for (const note of notes) {
    const existing = byDate.get(note.date) ?? [];
    existing.push(note);
    byDate.set(note.date, existing);
  }

  // Para cada data, agrupar por ward
  const result: GroupedNotes[] = [];

  for (const [date, dateNotes] of byDate) {
    const byWard = new Map<string, Note[]>();

    for (const note of dateNotes) {
      const existing = byWard.get(note.ward) ?? [];
      existing.push(note);
      byWard.set(note.ward, existing);
    }

    // Ordenar wards alfabeticamente e notas por createdAt desc
    const wards = Array.from(byWard.entries())
      .sort((a, b) => a[0].localeCompare(b[0])) // ordem alfabética
      .map(([ward, wardNotes]) => ({
        ward,
        notes: [...wardNotes].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }));

    result.push({ date, wards });
  }

  // Ordenar datas: mais recentes primeiro
  result.sort((a, b) => b.date.localeCompare(a.date));

  return result;
}
