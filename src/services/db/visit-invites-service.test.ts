/**
 * Testes para visit-invites-service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Factory function para vi.mock
vi.mock('@/services/db/dexie-db', () => {
  const createMockQuery = () => ({
    toArray: vi.fn().mockResolvedValue([]),
    first: vi.fn().mockResolvedValue(undefined),
  });

  return {
    db: {
      visitInvites: {
        put: vi.fn(),
        where: vi.fn(() => ({
          equals: vi.fn(() => createMockQuery()),
        })),
        get: vi.fn(),
      },
    },
  };
});

// Mock do auth-service
vi.mock('@/services/auth/auth-service', () => ({
  getAuthState: vi.fn(() => ({
    user: { uid: 'user-123' },
    loading: false,
    error: null,
  })),
}));

import { createVisitInviteForVisit, listActiveVisitInvites, findInviteByToken, revokeVisitInvite } from './visit-invites-service';
import { createVisitInvite, revokeInvite } from '@/models/visit-invite';
import { db } from './dexie-db';

// Cast para os mocks para evitar erros de tipo
const mockDb = db as unknown as {
  visitInvites: {
    put: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
};

describe('visit-invites-service - createVisitInviteForVisit', () => {
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
    expect(mockDb.visitInvites.put).toHaveBeenCalledWith(invite);
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
});

describe('visit-invites-service - listActiveVisitInvites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista só convites ativos (não expirados e não revogados)', async () => {
    const activeInvite = createVisitInvite({ visitId: 'visit-1', createdByUserId: 'u1', role: 'editor', expiresInHours: 24 });
    const expiredInvite = createVisitInvite({ visitId: 'visit-1', createdByUserId: 'u1', role: 'viewer', expiresInHours: -1 });
    const revokedInvite = revokeInvite(createVisitInvite({ visitId: 'visit-1', createdByUserId: 'u1', role: 'viewer', expiresInHours: 24 }));

    const mockToArray = vi.fn().mockResolvedValue([activeInvite, expiredInvite, revokedInvite]);

    // Configura o mock
    (mockDb.visitInvites.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: mockToArray,
        first: vi.fn(),
      }),
    } as never);

    const result = await listActiveVisitInvites('visit-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(activeInvite.id);
  });

  it('retorna array vazio quando não há convites', async () => {
    const mockToArray = vi.fn().mockResolvedValue([]);

    (mockDb.visitInvites.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: mockToArray,
        first: vi.fn(),
      }),
    } as never);

    const result = await listActiveVisitInvites('visit-1');

    expect(result).toHaveLength(0);
  });
});

describe('visit-invites-service - findInviteByToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca convite por token e retorna resultado', async () => {
    const invite = createVisitInvite({ visitId: 'visit-1', createdByUserId: 'u1', role: 'editor' });
    const mockFirst = vi.fn().mockResolvedValue(invite);

    (mockDb.visitInvites.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn(),
        first: mockFirst,
      }),
    } as never);

    const result = await findInviteByToken(invite.token);

    expect(result).toBeDefined();
    expect(result?.token).toBe(invite.token);
    expect(mockFirst).toHaveBeenCalled();
  });

  it('retorna undefined quando token não existe', async () => {
    const mockFirst = vi.fn().mockResolvedValue(undefined);

    (mockDb.visitInvites.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn(),
        first: mockFirst,
      }),
    } as never);

    const result = await findInviteByToken('non-existent-token');

    expect(result).toBeUndefined();
  });
});

describe('visit-invites-service - revokeVisitInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna undefined quando convite não existe', async () => {
    (mockDb.visitInvites.get).mockResolvedValue(undefined);

    const result = await revokeVisitInvite('non-existent-id');

    expect(result).toBeUndefined();
    expect(mockDb.visitInvites.put).not.toHaveBeenCalled();
  });

  it('revoga convite e persiste quando convite existe', async () => {
    const invite = createVisitInvite({ visitId: 'visit-1', createdByUserId: 'u1', role: 'editor' });

    (mockDb.visitInvites.get).mockResolvedValue(invite);

    const result = await revokeVisitInvite(invite.id);

    expect(result?.revokedAt).toBeDefined();

    // Verifica que put foi chamado com um objeto contendo revokedAt
    const putCalls = (mockDb.visitInvites.put).mock.calls;
    expect(putCalls.length).toBe(1);
    const calledArg = putCalls[0][0] as { revokedAt?: Date };
    expect(calledArg.revokedAt).toBeInstanceOf(Date);
  });
});
