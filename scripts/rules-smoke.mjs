// Harness formal de verificação das Firestore rules (runbook R1 — slices 002/003).
// Matriz executável de allow/deny via @firebase/rules-unit-testing (devDependency de
// validação apenas; fora de src/, nada de produção importa isto).
//
// Slice 003 — matriz completa de members/notes:
//   R1 canEditVisit inclui admin  |  R2 list OR (próprio membership OU owner/admin)
//   R3 update com branches (auto-reafirmação do owner / gerência de outros)
//   R4 create só bootstrap do owner  |  R5 delete fechado  |  R6 collection group intacto
//
// Uso:
//   firebase emulators:exec --only firestore --project demo-rules-smoke \
//     "node scripts/rules-smoke.mjs"
//
// RED (rules atuais): exit != 0 com as divergências da nova matriz
// (ex.: owner altera/deleta o próprio member doc — permitido hoje).
// GREEN (rules do slice): exit 0, todas as linhas PASS.
//
// Nota de robustez: na fase RED, linhas que as rules ATUAIS permitem (e que o slice
// passa a negar) MUTAM o seed. A matriz é ordenada por dependência de estado e
// `reset()` re-semeia antes das linhas destrutivas para que o diagnóstico RED de
// cada linha seja independente e legível (GREEN: resets são no-ops).

import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';

const RULES = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID || 'demo-rules-smoke';

// ---------------------------------------------------------------- identidades
const OWNER = 'owner-uid';
const ADMIN = 'admin-uid';
const ADMIN2 = 'admin2-uid';
const EDITOR = 'editor-uid';
const VIEWER = 'viewer-uid';
const REMOVED = 'removed-uid';
const STRANGER = 'stranger-uid';
const INVITEE = 'invitee-uid';

const VISIT = 'visit-main'; // visita principal com todos os papéis
const VISIT_BOOT = 'visit-boot'; // visita sem members (bootstrap do owner)
const VISIT_BOOT2 = 'visit-boot2'; // idem — bootstrap com setDoc merge (formato sync-service)

// ---------------------------------------------------------------- helpers
let testEnv;

function memberDoc(uid, role, status = 'active') {
  const doc = {
    id: `${VISIT}:${uid}`,
    visitId: VISIT,
    userId: uid,
    role,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (status === 'removed') {
    doc.removedAt = new Date();
  }
  return doc;
}

function bootMemberDoc(uid, role, status = 'active') {
  return {
    id: `${VISIT_BOOT}:${uid}`,
    visitId: VISIT_BOOT,
    userId: uid,
    role,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function boot2MemberDoc(uid, role, status = 'active') {
  return {
    id: `${VISIT_BOOT2}:${uid}`,
    visitId: VISIT_BOOT2,
    userId: uid,
    role,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function noteDoc(id, authorUid, overrides = {}) {
  return {
    id,
    userId: authorUid,
    visitId: VISIT,
    bed: '101A',
    note: 'nota original',
    date: '2026-01-01',
    syncStatus: 'synced',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    // Visita principal — todos os papéis + alvos de cenário
    await db.doc(`visits/${VISIT}`).set({ userId: OWNER, name: 'Visita teste' });
    const members = {
      [OWNER]: ['owner', 'active'],
      [ADMIN]: ['admin', 'active'],
      [ADMIN2]: ['admin', 'active'],
      [EDITOR]: ['editor', 'active'],
      [VIEWER]: ['viewer', 'active'],
      [REMOVED]: ['editor', 'removed'],
      'member-promote': ['editor', 'active'], // admin promove editor→admin
      'member-demote': ['admin', 'active'], // admin rebaixa outro admin→editor
      'member-owner-mgmt': ['editor', 'active'], // owner promove (regressão)
      'member-role-owner': ['editor', 'active'], // payload com role owner
      'member-status-change': ['editor', 'active'], // escrita direta de status
      'member-tamper': ['editor', 'active'], // identidade (id/userId/visitId)
    };
    for (const [uid, [role, status]] of Object.entries(members)) {
      await db.doc(`visits/${VISIT}/members/${uid}`).set(memberDoc(uid, role, status));
    }

    // Visita de bootstrap: doc da visita existe, members vazia
    await db.doc(`visits/${VISIT_BOOT}`).set({ userId: OWNER, name: 'Visita boot' });
    await db.doc(`visits/${VISIT_BOOT2}`).set({ userId: OWNER, name: 'Visita boot 2' });

    // Notas pré-existentes (update/delete de admin; regressões)
    await db.doc(`visits/${VISIT}/notes/note-update`).set(noteDoc('note-update', EDITOR));
    await db.doc(`visits/${VISIT}/notes/note-delete`).set(noteDoc('note-delete', EDITOR));
  });
}

async function matrix() {
  const results = [];
  const run = async (name, fn) => {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (e) {
      const msg = e && e.message ? String(e.message).split('\n')[0] : String(e);
      results.push({ name, ok: false, error: msg });
    }
  };
  const reset = async () => {
    await seed();
  };

  const ctxs = {
    owner: testEnv.authenticatedContext(OWNER),
    admin: testEnv.authenticatedContext(ADMIN),
    admin2: testEnv.authenticatedContext(ADMIN2),
    editor: testEnv.authenticatedContext(EDITOR),
    viewer: testEnv.authenticatedContext(VIEWER),
    removed: testEnv.authenticatedContext(REMOVED),
    stranger: testEnv.authenticatedContext(STRANGER),
    invitee: testEnv.authenticatedContext(INVITEE),
    anon: testEnv.unauthenticatedContext(),
  };
  const db = {
    owner: ctxs.owner.firestore(),
    admin: ctxs.admin.firestore(),
    admin2: ctxs.admin2.firestore(),
    editor: ctxs.editor.firestore(),
    viewer: ctxs.viewer.firestore(),
    removed: ctxs.removed.firestore(),
    stranger: ctxs.stranger.firestore(),
    invitee: ctxs.invitee.firestore(),
    anon: ctxs.anon.firestore(),
  };

  const membersCol = (d) => d.collection('visits').doc(VISIT).collection('members');
  const memberRef = (d, uid) => d.doc(`visits/${VISIT}/members/${uid}`);
  const bootMemberRef = (d, uid) => d.doc(`visits/${VISIT_BOOT}/members/${uid}`);
  const boot2MemberRef = (d, uid) => d.doc(`visits/${VISIT_BOOT2}/members/${uid}`);

  // ============================================================= R2 — list (read-only)
  await run('list: admin lista subcoleção de members sem filtro → permitido', () =>
    assertSucceeds(membersCol(db.admin).get())
  );
  await run('list: owner lista subcoleção de members sem filtro → permitido', () =>
    assertSucceeds(membersCol(db.owner).get())
  );
  await run('list: editor lista subcoleção sem filtro → negado', () =>
    assertFails(membersCol(db.editor).get())
  );
  await run('list: editor com where(userId==próprio uid) → permitido', () =>
    assertSucceeds(membersCol(db.editor).where('userId', '==', EDITOR).get())
  );
  await run('list: viewer com where(userId==próprio uid) → permitido', () =>
    assertSucceeds(membersCol(db.viewer).where('userId', '==', VIEWER).get())
  );
  await run('list: removido lista sem filtro → negado', () =>
    assertFails(membersCol(db.removed).get())
  );
  await run('list: não autenticado lista → negado', () =>
    assertFails(membersCol(db.anon).get())
  );

  // ============================================================= R6 — collection group (regressão, bloco inalterado)
  await run('cg: editor collectionGroup members filtrado por userId → permitido', () =>
    assertSucceeds(db.editor.collectionGroup('members').where('userId', '==', EDITOR).get())
  );
  await run('cg: owner collectionGroup members filtrado por userId → permitido', () =>
    assertSucceeds(db.owner.collectionGroup('members').where('userId', '==', OWNER).get())
  );
  await run('cg: estranho sem membership com where userId próprio → permitido (vazio)', () =>
    assertSucceeds(db.stranger.collectionGroup('members').where('userId', '==', STRANGER).get())
  );
  await run('cg: estranho sem membership sem filtro → negado', () =>
    assertFails(db.stranger.collectionGroup('members').get())
  );

  // ============================================================= R1 — canEditVisit inclui admin (notes)
  await run('notes: admin cria nota → permitido', () =>
    assertSucceeds(
      db.admin.doc(`visits/${VISIT}/notes/note-admin-create`).set(noteDoc('note-admin-create', ADMIN))
    )
  );
  await run('notes: admin edita nota existente → permitido', () =>
    assertSucceeds(db.admin.doc(`visits/${VISIT}/notes/note-update`).update({ note: 'editada por admin' }))
  );
  await run('notes: admin apaga nota → permitido', () =>
    assertSucceeds(db.admin.doc(`visits/${VISIT}/notes/note-delete`).delete())
  );
  await run('notes: editor cria nota (regressão) → permitido', () =>
    assertSucceeds(
      db.editor.doc(`visits/${VISIT}/notes/note-editor-create`).set(noteDoc('note-editor-create', EDITOR))
    )
  );
  await run('notes: owner cria nota (regressão) → permitido', () =>
    assertSucceeds(
      db.owner.doc(`visits/${VISIT}/notes/note-owner-create`).set(noteDoc('note-owner-create', OWNER))
    )
  );
  await run('notes: admin cria nota com visitId divergente → negado (guard intacto)', () =>
    assertFails(
      db.admin
        .doc(`visits/${VISIT}/notes/note-wrong-visit`)
        .set(noteDoc('note-wrong-visit', ADMIN, { visitId: 'outra-visita' }))
    )
  );
  await run('notes: viewer cria nota → negado', () =>
    assertFails(
      db.viewer.doc(`visits/${VISIT}/notes/note-viewer-create`).set(noteDoc('note-viewer-create', VIEWER))
    )
  );

  // ============================================================= R3 — update: allows (branches (a)/(b))
  await run('update: admin muda papel de editor→admin → permitido', () =>
    assertSucceeds(memberRef(db.admin, 'member-promote').update({ role: 'admin' }))
  );
  await run('update: admin rebaixa outro admin→editor → permitido', () =>
    assertSucceeds(memberRef(db.admin2, 'member-demote').update({ role: 'editor' }))
  );
  await run('update: owner muda papel de editor→admin (regressão) → permitido', () =>
    assertSucceeds(memberRef(db.owner, 'member-owner-mgmt').update({ role: 'admin' }))
  );
  // Owner auto-reafirmação exatamente no formato do push de hardening do sync-service
  // (setDoc com merge: id/visitId/userId/role/status + createdAt/updatedAt).
  await run('update: owner reafirma o próprio membership (sync push, merge) → permitido', () =>
    assertSucceeds(
      memberRef(db.owner, OWNER).set(
        {
          id: `${VISIT}:${OWNER}`,
          visitId: VISIT,
          userId: OWNER,
          role: 'owner',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    )
  );
  await run('update: owner reafirma o próprio membership (doc completo) → permitido', () =>
    assertSucceeds(
      memberRef(db.owner, OWNER).set({
        id: `${VISIT}:${OWNER}`,
        visitId: VISIT,
        userId: OWNER,
        role: 'owner',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    )
  );

  // ============================================================= R3 — update: denials que já não mutam (RED-safe)
  await run('update: admin altera o próprio papel (alvo==requester) → negado', () =>
    assertFails(memberRef(db.admin, ADMIN).update({ role: 'viewer' }))
  );
  await run('update: admin altera papel do owner (alvo owner) → negado', () =>
    assertFails(memberRef(db.admin, OWNER).set(memberDoc(OWNER, 'editor')))
  );
  await run('update: admin grava role owner em outro membro (payload owner) → negado', () =>
    assertFails(memberRef(db.admin, 'member-role-owner').set(memberDoc('member-role-owner', 'owner')))
  );
  await run('update: admin reativa membro removido por escrita direta → negado', () =>
    assertFails(memberRef(db.admin, REMOVED).set(memberDoc(REMOVED, 'editor', 'active')))
  );
  await run('update: admin altera userId do member (identidade) → negado', () =>
    assertFails(memberRef(db.admin, 'member-tamper').update({ userId: 'outro-uid' }))
  );
  await run('update: editor tenta mudar papel de outro membro → negado', () =>
    assertFails(memberRef(db.editor, 'member-promote').update({ role: 'admin' }))
  );
  await run('update: viewer tenta mudar o próprio papel → negado', () =>
    assertFails(memberRef(db.viewer, VIEWER).update({ role: 'editor' }))
  );
  await run('update: removido tenta mudar o próprio doc → negado', () =>
    assertFails(memberRef(db.removed, REMOVED).update({ role: 'viewer' }))
  );

  // ============================================================= R3 — update: denials do owner que MUTAM em RED
  // (cada uma precedida de reset() para estado pristino do alvo)
  await reset();
  await run('update: owner grava role owner em outro membro (payload owner) → negado', () =>
    assertFails(memberRef(db.owner, 'member-role-owner').set(memberDoc('member-role-owner', 'owner')))
  );
  await reset();
  await run('update: owner reativa membro removido por escrita direta → negado', () =>
    assertFails(memberRef(db.owner, REMOVED).set(memberDoc(REMOVED, 'editor', 'active')))
  );
  await reset();
  await run('update: owner muda status de ativo→removido por escrita direta → negado', () =>
    assertFails(memberRef(db.owner, 'member-status-change').set(memberDoc('member-status-change', 'editor', 'removed')))
  );
  await reset();
  await run('update: owner altera userId do member (identidade) → negado', () =>
    assertFails(memberRef(db.owner, 'member-tamper').update({ userId: 'outro-uid' }))
  );
  await reset();
  await run('update: owner altera id do member (identidade) → negado', () =>
    assertFails(memberRef(db.owner, 'member-tamper').update({ id: 'id-forjado' }))
  );
  await reset();
  await run('update: owner altera visitId do member (identidade) → negado', () =>
    assertFails(memberRef(db.owner, 'member-tamper').update({ visitId: 'outra-visita' }))
  );

  // ============================================================= R4 — create (apenas bootstrap)
  await run('create: owner faz bootstrap do próprio doc (visit.userId) → permitido', () =>
    assertSucceeds(bootMemberRef(db.owner, OWNER).set(bootMemberDoc(OWNER, 'owner')))
  );
  await run('create: owner faz bootstrap com setDoc merge (formato sync-service) → permitido', () =>
    assertSucceeds(boot2MemberRef(db.owner, OWNER).set(boot2MemberDoc(OWNER, 'owner'), { merge: true }))
  );
  await run('create: editor cria membership de terceiro → negado', () =>
    assertFails(memberRef(db.editor, STRANGER).set(memberDoc(STRANGER, 'viewer')))
  );
  await reset();
  await run('create: owner cria membership de terceiro → negado', () =>
    assertFails(memberRef(db.owner, STRANGER).set(memberDoc(STRANGER, 'viewer')))
  );
  await run('create: admin cria membership de terceiro → negado', () =>
    assertFails(bootMemberRef(db.admin, STRANGER).set(bootMemberDoc(STRANGER, 'editor')))
  );
  await run('create: admin cria membership de terceiro com role admin → negado', () =>
    assertFails(bootMemberRef(db.admin, STRANGER).set(bootMemberDoc(STRANGER, 'admin')))
  );
  await run('create: convidado tenta criar o próprio membership direto → negado', () =>
    assertFails(memberRef(db.invitee, INVITEE).set(memberDoc(INVITEE, 'editor')))
  );

  // ============================================================= R5 — delete fechado (bloco final: cada linha
  // destrutiva em RED com reset() prévio para estado pristino)
  await run('delete: editor apaga o próprio member doc → negado', () =>
    assertFails(memberRef(db.editor, EDITOR).delete())
  );
  await run('delete: admin apaga member doc de outro membro → negado', () =>
    assertFails(memberRef(db.admin, EDITOR).delete())
  );
  await reset();
  await run('delete: owner apaga member doc de outro membro → negado', () =>
    assertFails(memberRef(db.owner, EDITOR).delete())
  );
  await reset();
  await run('delete: owner apaga o próprio member doc → negado', () =>
    assertFails(memberRef(db.owner, OWNER).delete())
  );
  await reset();
  await run('update: owner demove o próprio doc (role→viewer) → negado', () =>
    assertFails(memberRef(db.owner, OWNER).set(memberDoc(OWNER, 'viewer')))
  );
  await reset();
  await run('update: owner rebaixa o próprio doc (role→admin) → negado', () =>
    assertFails(memberRef(db.owner, OWNER).set(memberDoc(OWNER, 'admin')))
  );
  await reset();
  await run('update: owner rebaixa o próprio doc via update (role→editor) → negado', () =>
    assertFails(memberRef(db.owner, OWNER).update({ role: 'editor' }))
  );

  for (const ctx of Object.values(ctxs)) {
    ctx.cleanup();
  }
  return results;
}

const results = await (async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES },
  });
  await seed();
  const r = await matrix();
  await testEnv.cleanup();
  return r;
})();

let divergencias = 0;
for (const r of results) {
  if (!r.ok) divergencias += 1;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.error ? `  (${r.error})` : ''}`);
}
console.log(`\n${results.length - divergencias}/${results.length} linhas ok; divergências: ${divergencias}`);
process.exit(divergencias > 0 ? 1 : 0);
