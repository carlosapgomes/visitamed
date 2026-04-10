/**
 * One-off admin script: auditoria + cleanup de notas legadas em /users/{uid}/notes/{noteId}
 *
 * Pré-requisito:
 * - Credencial admin disponível (ex.: GOOGLE_APPLICATION_CREDENTIALS)
 *
 * Como rodar (a partir da raiz do projeto):
 * 1) Build:
 *    npm --prefix functions run build
 * 2) Dry-run (padrão):
 *    node functions/lib/scripts/legacy-user-notes-cleanup.js
 * 3) Cleanup destrutivo explícito:
 *    node functions/lib/scripts/legacy-user-notes-cleanup.js --apply
 *
 * Opcional:
 * - Definir projeto explicitamente: --project <firebase-project-id>
 */

import * as admin from 'firebase-admin';

const LOOKUP_BATCH_SIZE = 300;
const DELETE_BATCH_SIZE = 400;
const MAX_SAMPLE_PATHS = 20;

interface CliOptions {
  apply: boolean;
  help: boolean;
  projectId?: string;
}

interface LegacyNoteRecord {
  userId: string;
  noteId: string;
  visitId: string | null;
  ref: FirebaseFirestore.DocumentReference;
}

interface AuditSummary {
  totalCollectionGroupNotesScanned: number;
  totalLegacyDocs: number;
  legacyDocsWithVisitId: number;
  legacyDocsWithoutVisitId: number;
  legacyDocsWithVisitMatch: number;
  legacyDocsWithoutVisitMatch: number;
  legacyDocsByUserId: Record<string, number>;
  sampleMissingVisitIdPaths: string[];
  sampleMissingVisitMatchPaths: string[];
}

interface AuditResult {
  summary: AuditSummary;
  legacyNoteRefs: FirebaseFirestore.DocumentReference[];
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    apply: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--project') {
      const projectId = argv[index + 1];
      if (!projectId || projectId.startsWith('--')) {
        throw new Error('Flag --project requer um valor, ex.: --project visitamed-36570');
      }
      options.projectId = projectId;
      index += 1;
      continue;
    }

    if (arg.startsWith('--project=')) {
      const projectId = arg.slice('--project='.length).trim();
      if (!projectId) {
        throw new Error('Flag --project requer um valor, ex.: --project=visitamed-36570');
      }
      options.projectId = projectId;
      continue;
    }

    throw new Error(`Flag não reconhecida: ${arg}`);
  }

  return options;
}

function printUsage(): void {
  console.log('Uso: node functions/lib/scripts/legacy-user-notes-cleanup.js [--apply] [--project <id>]');
  console.log('  --apply           Executa deleção (sem essa flag = dry-run)');
  console.log('  --project <id>    Define projectId explicitamente');
}

function parseLegacyUserNotePath(path: string): { userId: string; noteId: string } | null {
  const segments = path.split('/');

  if (segments.length !== 4) {
    return null;
  }

  if (segments[0] !== 'users' || segments[2] !== 'notes') {
    return null;
  }

  const userId = segments[1]?.trim() ?? '';
  const noteId = segments[3]?.trim() ?? '';

  if (!userId || !noteId) {
    return null;
  }

  return { userId, noteId };
}

function parseVisitId(data: FirebaseFirestore.DocumentData): string | null {
  const visitId = data['visitId'];

  if (typeof visitId !== 'string') {
    return null;
  }

  const trimmed = visitId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function incrementUserCount(map: Map<string, number>, userId: string): void {
  const current = map.get(userId) ?? 0;
  map.set(userId, current + 1);
}

function pushSample(sample: string[], value: string): void {
  if (sample.length < MAX_SAMPLE_PATHS) {
    sample.push(value);
  }
}

async function auditLegacyUserNotes(firestore: FirebaseFirestore.Firestore): Promise<AuditResult> {
  const notesSnapshot = await firestore.collectionGroup('notes').get();

  const legacyNoteRecords: LegacyNoteRecord[] = [];
  const legacyNotesWithVisitId: LegacyNoteRecord[] = [];
  const legacyDocsByUserMap = new Map<string, number>();
  const sampleMissingVisitIdPaths: string[] = [];
  const sampleMissingVisitMatchPaths: string[] = [];

  let legacyDocsWithoutVisitId = 0;

  for (const noteDoc of notesSnapshot.docs) {
    const legacyPath = parseLegacyUserNotePath(noteDoc.ref.path);
    if (!legacyPath) {
      continue;
    }

    const visitId = parseVisitId(noteDoc.data());
    const record: LegacyNoteRecord = {
      userId: legacyPath.userId,
      noteId: legacyPath.noteId,
      visitId,
      ref: noteDoc.ref,
    };

    legacyNoteRecords.push(record);
    incrementUserCount(legacyDocsByUserMap, legacyPath.userId);

    if (visitId) {
      legacyNotesWithVisitId.push(record);
      continue;
    }

    legacyDocsWithoutVisitId += 1;
    pushSample(sampleMissingVisitIdPaths, noteDoc.ref.path);
  }

  let legacyDocsWithVisitMatch = 0;
  let legacyDocsWithoutVisitMatch = 0;

  for (let start = 0; start < legacyNotesWithVisitId.length; start += LOOKUP_BATCH_SIZE) {
    const chunk = legacyNotesWithVisitId.slice(start, start + LOOKUP_BATCH_SIZE);

    const visitNoteRefs = chunk.map((record) =>
      firestore.collection('visits').doc(record.visitId as string).collection('notes').doc(record.noteId)
    );

    const visitNoteSnaps = await firestore.getAll(...visitNoteRefs);

    for (let index = 0; index < visitNoteSnaps.length; index += 1) {
      const visitNoteSnap = visitNoteSnaps[index];
      const record = chunk[index];

      if (visitNoteSnap?.exists) {
        legacyDocsWithVisitMatch += 1;
        continue;
      }

      legacyDocsWithoutVisitMatch += 1;
      pushSample(sampleMissingVisitMatchPaths, record.ref.path);
    }
  }

  const legacyDocsByUserId = Object.fromEntries(
    [...legacyDocsByUserMap.entries()].sort((left, right) => right[1] - left[1])
  );

  const summary: AuditSummary = {
    totalCollectionGroupNotesScanned: notesSnapshot.size,
    totalLegacyDocs: legacyNoteRecords.length,
    legacyDocsWithVisitId: legacyNotesWithVisitId.length,
    legacyDocsWithoutVisitId,
    legacyDocsWithVisitMatch,
    legacyDocsWithoutVisitMatch,
    legacyDocsByUserId,
    sampleMissingVisitIdPaths,
    sampleMissingVisitMatchPaths,
  };

  return {
    summary,
    legacyNoteRefs: legacyNoteRecords.map((record) => record.ref),
  };
}

async function deleteLegacyUserNotes(
  firestore: FirebaseFirestore.Firestore,
  refs: FirebaseFirestore.DocumentReference[]
): Promise<number> {
  let deletedCount = 0;

  for (let start = 0; start < refs.length; start += DELETE_BATCH_SIZE) {
    const chunk = refs.slice(start, start + DELETE_BATCH_SIZE);
    const batch = firestore.batch();

    for (const ref of chunk) {
      batch.delete(ref);
    }

    await batch.commit();
    deletedCount += chunk.length;
  }

  return deletedCount;
}

function printSummary(summary: AuditSummary): void {
  console.log('');
  console.log('=== Auditoria de notas legadas em /users/{uid}/notes ===');
  console.log(`collectionGroup('notes') escaneado: ${String(summary.totalCollectionGroupNotesScanned)}`);
  console.log(`Total legado encontrado: ${String(summary.totalLegacyDocs)}`);
  console.log(`Com visitId válido: ${String(summary.legacyDocsWithVisitId)}`);
  console.log(`Sem visitId válido: ${String(summary.legacyDocsWithoutVisitId)}`);
  console.log(
    `Com correspondente em /visits/{visitId}/notes/{noteId}: ${String(summary.legacyDocsWithVisitMatch)}`
  );
  console.log(
    `Sem correspondente em /visits/{visitId}/notes/{noteId}: ${String(summary.legacyDocsWithoutVisitMatch)}`
  );

  console.log('');
  console.log('Contagem por userId (owner do path):');
  console.log(JSON.stringify(summary.legacyDocsByUserId, null, 2));

  if (summary.sampleMissingVisitIdPaths.length > 0) {
    console.log('');
    console.log(`Exemplos sem visitId válido (máx ${String(MAX_SAMPLE_PATHS)}):`);
    for (const path of summary.sampleMissingVisitIdPaths) {
      console.log(`- ${path}`);
    }
  }

  if (summary.sampleMissingVisitMatchPaths.length > 0) {
    console.log('');
    console.log(`Exemplos sem correspondente em /visits/... (máx ${String(MAX_SAMPLE_PATHS)}):`);
    for (const path of summary.sampleMissingVisitMatchPaths) {
      console.log(`- ${path}`);
    }
  }
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const app = options.projectId
    ? admin.initializeApp({ projectId: options.projectId })
    : admin.initializeApp();

  const firestore = app.firestore();

  console.log(options.apply
    ? '[legacy-user-notes-cleanup] Modo APPLY (destrutivo) habilitado via --apply'
    : '[legacy-user-notes-cleanup] Modo DRY-RUN (padrão)');

  if (options.projectId) {
    console.log(`[legacy-user-notes-cleanup] Projeto explícito: ${options.projectId}`);
  }

  const audit = await auditLegacyUserNotes(firestore);
  printSummary(audit.summary);

  console.log('');
  console.log(`[legacy-user-notes-cleanup] Docs legados alvo para cleanup: ${String(audit.legacyNoteRefs.length)}`);

  if (!options.apply) {
    console.log('[legacy-user-notes-cleanup] Dry-run finalizado. Nenhum documento foi apagado.');
    await app.delete();
    return;
  }

  if (audit.legacyNoteRefs.length === 0) {
    console.log('');
    console.log('[legacy-user-notes-cleanup] Nada para apagar.');
    await app.delete();
    return;
  }

  const deletedCount = await deleteLegacyUserNotes(firestore, audit.legacyNoteRefs);

  console.log('');
  console.log(`[legacy-user-notes-cleanup] Cleanup concluído. Docs apagados: ${String(deletedCount)}`);

  await app.delete();
}

void main().catch((error: unknown) => {
  console.error('[legacy-user-notes-cleanup] Falha:', error);
  process.exitCode = 1;
});
