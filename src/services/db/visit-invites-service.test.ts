/**
 * Testes para visit-invites-service (S11B - Firestore remoto)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock do Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'),
  collection: vi.fn(() => 'mock-collection-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() =>
    Promise.resolve({
      exists: () => true,
      data: () => ({
        id: 'invite-1',
        visitId: 'visit-1',
        createdByUserId: 'user-123',
        token: 'invite-1',
        role: 'editor',
        expiresAt: { toDate: () => new Date(Date.now() + 86400000) },
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        revokedAt: null,
      }),
    })
  ),
  getDocs: vi.fn(() =>
    Promise.resolve({
      forEach: (callback: (doc: { data: () => Record<string, unknown> }) => void) => {
        callback({
          data: () => ({
            id: 'invite-1',
            visitId: 'visit-1',
            createdByUserId: 'user-123',
            token: 'token-1',
            role: 'editor',
            expiresAt: { toDate: () => new Date(Date.now() + 86400000) },
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
            revokedAt: null,
          }),
        });
      },
    })
  ),
  updateDoc: vi.fn(() => Promise.resolve()),
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
}));

vi.mock('@/services/auth/firebase', () => ({
  getFirebaseFirestore: vi.fn(() => ({})),
}));

vi.mock('@/services/auth/auth-service', () => ({
  getAuthState: vi.fn(() => ({
    user: { uid: 'user-123' },
    loading: false,
    error: null,
  })),
}));

vi.mock('./visit-members-service', () => ({
  getVisitMember: vi.fn(),
  getCurrentUserVisitMember: vi.fn(() =>
    Promise.resolve({
      id: 'visit-1:user-123',
      visitId: 'visit-1',
      userId: 'user-123',
      role: 'owner',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  ),
}));

vi.mock('./dexie-db', () => ({
  db: {
    visitInvites: {
      put: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
          first: vi.fn().mockResolvedValue(undefined),
        })),
      })),
      get: vi.fn(),
    },
    visitMembers: {
      put: vi.fn(),
      get: vi.fn(),
    },
  },
}));

import {
  createVisitInviteForVisit,
  listActiveVisitInvites,
  revokeVisitInvite,
  acceptVisitInviteByToken,
} from './visit-invites-service';
import { createVisitInvite } from '@/models/visit-invite';
import { createVisitMember, type VisitMember } from '@/models/visit-member';
import { getFirebaseFirestore } from '@/services/auth/firebase';
import { getVisitMember } from './visit-members-service';
import { db } from './dexie-db';

describe('visit-invites-service - createVisitInviteForVisit (Firestore remoto)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria convite com createdByUserId do usuário logado', async () => {
    const invite = await createVisitInviteForVisit({
      visitId: 'visit-1',
      role: 'editor',
    });

    expect(invite.createdByUserId).toBe('user-123');
    expect(invite.visitId).toBe('visit-1');
    expect(invite.role).toBe('editor');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(db.visitInvites.put).not.toHaveBeenCalled();
  });

  it('cria convite com expiração customizada', async () => {
    const invite = await createVisitInviteForVisit({
      visitId: 'visit-1',
      role: 'viewer',
      expiresInHours: 12,
    });

    const diffHours = (invite.expiresAt.getTime() - invite.createdAt.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(12, 0);
  });

  it('lança erro quando usuário não é owner', async () => {
    const { getCurrentUserVisitMember } = await import('./visit-members-service');
    vi.mocked(getCurrentUserVisitMember).mockResolvedValueOnce({
      id: 'visit-1:user-123',
      visitId: 'visit-1',
      userId: 'user-123',
      role: 'editor',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      createVisitInviteForVisit({ visitId: 'visit-1', role: 'editor' })
    ).rejects.toThrow('Apenas o owner pode criar ou revogar convites.');
  });

  it('lança erro quando Firestore não configurado', async () => {
    vi.mocked(getFirebaseFirestore).mockReturnValueOnce(undefined as never);

    await expect(
      createVisitInviteForVisit({ visitId: 'visit-1', role: 'editor' })
    ).rejects.toThrow('Firestore não configurado');
  });
});

describe('visit-invites-service - listActiveVisitInvites (Firestore remoto)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista só convites ativos (não expirados e não revogados)', async () => {
    const result = await listActiveVisitInvites('visit-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('invite-1');
  });

  it('retorna array vazio quando não há convites', async () => {
    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValueOnce({
      forEach: (_callback: (doc: unknown) => void) => {
        // vazio
      },
    } as never);

    const result = await listActiveVisitInvites('visit-1');

    expect(result).toHaveLength(0);
  });

  it('lança erro quando Firestore não configurado', async () => {
    vi.mocked(getFirebaseFirestore).mockReturnValueOnce(undefined as never);

    await expect(listActiveVisitInvites('visit-1')).rejects.toThrow('Firestore não configurado');
  });
});

describe('visit-invites-service - revokeVisitInvite (Firestore remoto)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revoga convite e persiste quando convite existe', async () => {
    const result = await revokeVisitInvite('invite-1', 'visit-1');

    expect(result).toBeDefined();
    expect(result?.revokedAt).toBeDefined();
  });

  it('retorna undefined quando convite não existe', async () => {
    const { getDoc } = await import('firebase/firestore');
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as never);

    const result = await revokeVisitInvite('non-existent', 'visit-1');

    expect(result).toBeUndefined();
  });

  it('lança erro quando usuário não é owner', async () => {
    const { getCurrentUserVisitMember } = await import('./visit-members-service');
    vi.mocked(getCurrentUserVisitMember).mockResolvedValueOnce({
      id: 'visit-1:user-123',
      visitId: 'visit-1',
      userId: 'user-123',
      role: 'editor',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(revokeVisitInvite('invite-1', 'visit-1')).rejects.toThrow(
      'Apenas o owner pode criar ou revogar convites.'
    );
  });

  it('lança erro quando Firestore não configurado', async () => {
    vi.mocked(getFirebaseFirestore).mockReturnValueOnce(undefined as never);

    await expect(revokeVisitInvite('invite-1', 'visit-1')).rejects.toThrow('Firestore não configurado');
  });
});

// Testes de acceptVisitInviteByToken mantidos como estão (fluxo transitório local/Dexie)
describe('visit-invites-service - acceptVisitInviteByToken (local/Dexie)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna invite-not-found quando token não existe', async () => {
    const result = await acceptVisitInviteByToken('non-existent-token');

    expect(result.status).toBe('invite-not-found');
    expect(result.visitId).toBeUndefined();
  });

  it('retorna invite-revoked quando convite foi revogado', async () => {
    const invite = createVisitInvite({ visitId: 'visit-1', createdByUserId: 'u1', role: 'editor' });
    invite.revokedAt = new Date();

    const mockFirst = vi.fn().mockResolvedValue(invite);
    (db.visitInvites.where as ReturnType<typeof vi.fn>).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn(),
        first: mockFirst,
      }),
    } as never);

    const result = await acceptVisitInviteByToken(invite.token);

    expect(result.status).toBe('invite-revoked');
    expect(result.visitId).toBe('visit-1');
  });

  it('retorna invite-expired quando convite expirou', async () => {
    const invite = createVisitInvite({ visitId: 'visit-1', createdByUserId: 'u1', role: 'editor', expiresInHours: -1 });

    const mockFirst = vi.fn().mockResolvedValue(invite);
    (db.visitInvites.where as ReturnType<typeof vi.fn>).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn(),
        first: mockFirst,
      }),
    } as never);

    const result = await acceptVisitInviteByToken(invite.token);

    expect(result.status).toBe('invite-expired');
    expect(result.visitId).toBe('visit-1');
  });

  it('retorna already-member quando membership já está ativo', async () => {
    const invite = createVisitInvite({ visitId: 'visit-1', createdByUserId: 'u1', role: 'editor' });

    const mockFirst = vi.fn().mockResolvedValue(invite);
    (db.visitInvites.where as ReturnType<typeof vi.fn>).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn(),
        first: mockFirst,
      }),
    } as never);

    const existingMember: VisitMember = createVisitMember('visit-1', 'user-123', 'editor');
    vi.mocked(getVisitMember).mockResolvedValue(existingMember);

    const result = await acceptVisitInviteByToken(invite.token);

    expect(result.status).toBe('already-member');
    expect(result.visitId).toBe('visit-1');
  });

  it('retorna access-revoked quando membership existente foi removido', async () => {
    const invite = createVisitInvite({ visitId: 'visit-1', createdByUserId: 'u1', role: 'editor' });

    const mockFirst = vi.fn().mockResolvedValue(invite);
    (db.visitInvites.where as ReturnType<typeof vi.fn>).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn(),
        first: mockFirst,
      }),
    } as never);

    const existingMember: VisitMember = createVisitMember('visit-1', 'user-123', 'editor');
    existingMember.status = 'removed';
    existingMember.removedAt = new Date();
    vi.mocked(getVisitMember).mockResolvedValue(existingMember);

    const result = await acceptVisitInviteByToken(invite.token);

    expect(result.status).toBe('access-revoked');
    expect(result.visitId).toBe('visit-1');
  });

  it('retorna accepted e cria membership quando convite é válido', async () => {
    const invite = createVisitInvite({ visitId: 'visit-1', createdByUserId: 'u1', role: 'editor' });

    const mockFirst = vi.fn().mockResolvedValue(invite);
    (db.visitInvites.where as ReturnType<typeof vi.fn>).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn(),
        first: mockFirst,
      }),
    } as never);

    vi.mocked(getVisitMember).mockResolvedValue(undefined);

    const result = await acceptVisitInviteByToken(invite.token);

    expect(result.status).toBe('accepted');
    expect(result.visitId).toBe('visit-1');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(db.visitMembers.put).toHaveBeenCalled();
    const memberArg = (db.visitMembers.put as ReturnType<typeof vi.fn>).mock.calls[0][0] as VisitMember;
    expect(memberArg.visitId).toBe('visit-1');
    expect(memberArg.userId).toBe('user-123');
    expect(memberArg.role).toBe('editor');
    expect(memberArg.status).toBe('active');
  });

  it('cria membership com role viewer quando convite tem role viewer', async () => {
    const invite = createVisitInvite({ visitId: 'visit-1', createdByUserId: 'u1', role: 'viewer' });

    const mockFirst = vi.fn().mockResolvedValue(invite);
    (db.visitInvites.where as ReturnType<typeof vi.fn>).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn(),
        first: mockFirst,
      }),
    } as never);

    vi.mocked(getVisitMember).mockResolvedValue(undefined);

    const result = await acceptVisitInviteByToken(invite.token);

    expect(result.status).toBe('accepted');

    const memberArg = (db.visitMembers.put as ReturnType<typeof vi.fn>).mock.calls[0][0] as VisitMember;
    expect(memberArg.role).toBe('viewer');
  });
});
