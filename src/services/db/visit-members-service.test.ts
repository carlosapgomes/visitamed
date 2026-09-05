/**
 * Testes para visit-members-service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Factory function para vi.mock
vi.mock('@/services/db/dexie-db', () => {
  return {
    db: {
      visitMembers: {
        put: vi.fn(),
        bulkPut: vi.fn(),
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue([]),
            first: vi.fn().mockResolvedValue(undefined),
          })),
        })),
        get: vi.fn(),
      },
    },
  };
});

// Mock do auth-service
vi.mock('@/services/auth/auth-service', () => ({
  getAuthState: vi.fn(),
}));

// Mock do visit-permissions
vi.mock('@/services/auth/visit-permissions', () => ({
  canManageMembers: vi.fn(),
}));

// Mock do firebase (Firestore client)
vi.mock('@/services/auth/firebase', () => ({
  getFirebaseFirestore: vi.fn(),
}));

// Mock das funções do Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

import * as membersService from './visit-members-service';
import { createVisitMember, type VisitMember } from '@/models/visit-member';
import { db } from './dexie-db';
import { canManageMembers } from '@/services/auth/visit-permissions';
import { getAuthState } from '@/services/auth/auth-service';
import { getFirebaseFirestore } from '@/services/auth/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Cast para os mocks para evitar erros de tipo
const mockDb = db as unknown as {
  visitMembers: {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    bulkPut: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
  };
};

const mockCanManageMembers = canManageMembers as unknown as ReturnType<typeof vi.fn>;
const mockedGetAuthState = getAuthState as unknown as ReturnType<typeof vi.fn>;
const mockedGetFirebaseFirestore = getFirebaseFirestore as unknown as ReturnType<typeof vi.fn>;
const mockedCollection = collection as unknown as ReturnType<typeof vi.fn>;
const mockedGetDocs = getDocs as unknown as ReturnType<typeof vi.fn>;

const CURRENT_USER_ID = 'owner-user-id';
const VISIT_ID = 'visit-1';

function member(role: 'owner' | 'admin' | 'editor' | 'viewer', userId: string): VisitMember {
  return createVisitMember(VISIT_ID, userId, role);
}

describe('visit-members-service - fetchVisitMembersFromRemote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthState.mockReturnValue({
      user: { uid: CURRENT_USER_ID } as ReturnType<typeof getAuthState>['user'],
      loading: false,
      error: null,
    });
  });

  it('consulta a subcoleção members e faz upsert no cache com id canônico', async () => {
    mockedGetFirebaseFirestore.mockReturnValue({} as ReturnType<typeof getFirebaseFirestore>);
    mockedCollection.mockReturnValue('members-collection');
    mockedGetDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'editor-user-id',
          data: () => ({
            visitId: VISIT_ID,
            userId: 'editor-user-id',
            role: 'editor',
            status: 'active',
            createdAt: '2026-04-01T10:00:00.000Z',
            updatedAt: '2026-04-01T10:00:00.000Z',
            displayName: 'Dra. Ana',
          }),
        },
        {
          id: 'viewer-user-id',
          data: () => ({
            visitId: VISIT_ID,
            userId: 'viewer-user-id',
            role: 'viewer',
            status: 'active',
            createdAt: '2026-04-01T10:00:00.000Z',
          }),
        },
      ],
    } as Awaited<ReturnType<typeof getDocs>>);

    const result = await membersService.fetchVisitMembersFromRemote(VISIT_ID);

    expect(mockedGetFirebaseFirestore).toHaveBeenCalled();
    expect(mockedCollection).toHaveBeenCalledWith(
      {},
      'visits',
      VISIT_ID,
      'members'
    );
    expect(mockedGetDocs).toHaveBeenCalledWith('members-collection');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'visit-1:editor-user-id',
        visitId: VISIT_ID,
        userId: 'editor-user-id',
        role: 'editor',
        status: 'active',
        displayName: 'Dra. Ana',
      })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        id: 'visit-1:viewer-user-id',
        userId: 'viewer-user-id',
        role: 'viewer',
      })
    );

    // Upsert no cache Dexie com a lista convertida
    expect(mockDb.visitMembers.bulkPut).toHaveBeenCalledWith(result);
  });

  it('retorna lista vazia sem upsert quando a subcoleção está vazia', async () => {
    mockedGetFirebaseFirestore.mockReturnValue({} as ReturnType<typeof getFirebaseFirestore>);
    mockedCollection.mockReturnValue('members-collection');
    mockedGetDocs.mockResolvedValue({ empty: true, docs: [] });

    const result = await membersService.fetchVisitMembersFromRemote(VISIT_ID);

    expect(result).toEqual([]);
    expect(mockDb.visitMembers.bulkPut).not.toHaveBeenCalled();
  });

  it('propaga erro quando Firestore não está configurado', async () => {
    mockedGetFirebaseFirestore.mockReturnValue(null);

    await expect(membersService.fetchVisitMembersFromRemote(VISIT_ID)).rejects.toThrow(
      'Firestore não configurado'
    );
    expect(mockedGetDocs).not.toHaveBeenCalled();
  });

  it('propaga erro quando o getDocs falha', async () => {
    mockedGetFirebaseFirestore.mockReturnValue({} as ReturnType<typeof getFirebaseFirestore>);
    mockedCollection.mockReturnValue('members-collection');
    mockedGetDocs.mockRejectedValue(new Error('network unavailable'));

    await expect(membersService.fetchVisitMembersFromRemote(VISIT_ID)).rejects.toThrow(
      'network unavailable'
    );
    expect(mockDb.visitMembers.bulkPut).not.toHaveBeenCalled();
  });
});

describe('visit-members-service - removeVisitMemberAsAdmin', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);

    mockedGetAuthState.mockReturnValue({
      user: {
        uid: CURRENT_USER_ID,
        getIdToken: vi.fn().mockResolvedValue('id-token'),
      },
      loading: false,
      error: null,
    });
    mockCanManageMembers.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retorna forbidden quando usuário atual não tem membership e não chama endpoint', async () => {
    (mockDb.visitMembers.get).mockResolvedValue(undefined);

    const result = await membersService.removeVisitMemberAsAdmin(VISIT_ID, 'target-user-id');

    expect(result.status).toBe('forbidden');
    expect(result.visitId).toBe(VISIT_ID);
    expect(result.targetUserId).toBe('target-user-id');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retorna forbidden quando usuário atual não pode gerenciar membros', async () => {
    (mockDb.visitMembers.get).mockResolvedValue(member('editor', CURRENT_USER_ID));
    mockCanManageMembers.mockReturnValue(false);

    const result = await membersService.removeVisitMemberAsAdmin(VISIT_ID, 'target-user-id');

    expect(result.status).toBe('forbidden');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retorna target-not-found quando membro alvo não existe localmente', async () => {
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('owner', CURRENT_USER_ID))
      .mockResolvedValueOnce(undefined);
    mockCanManageMembers.mockReturnValue(true);

    const result = await membersService.removeVisitMemberAsAdmin(VISIT_ID, 'non-existent-user');

    expect(result.status).toBe('target-not-found');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retorna cannot-remove-self quando admin tenta se remover', async () => {
    (mockDb.visitMembers.get).mockResolvedValue(member('admin', CURRENT_USER_ID));
    mockCanManageMembers.mockReturnValue(true);

    const result = await membersService.removeVisitMemberAsAdmin(VISIT_ID, CURRENT_USER_ID);

    expect(result.status).toBe('cannot-remove-self');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retorna cannot-remove-owner quando alvo é owner', async () => {
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(member('owner', 'target-owner-id'));
    mockCanManageMembers.mockReturnValue(true);

    const result = await membersService.removeVisitMemberAsAdmin(VISIT_ID, 'target-owner-id');

    expect(result.status).toBe('cannot-remove-owner');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('chama endpoint e grava removed localmente em caso de 200', async () => {
    const targetMember = member('editor', 'target-user-id');
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(targetMember);
    mockCanManageMembers.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({ status: 'removed', visitId: VISIT_ID, targetUserId: 'target-user-id' }),
    });

    const result = await membersService.removeVisitMemberAsAdmin(VISIT_ID, 'target-user-id');

    expect(result.status).toBe('removed');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/visits/members/remove',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer id-token',
        }) as Record<string, string>,
        body: JSON.stringify({ visitId: VISIT_ID, targetUserId: 'target-user-id' }),
      })
    );

    expect(mockDb.visitMembers.put).toHaveBeenCalledTimes(1);
    const putArg = (mockDb.visitMembers.put).mock.calls[0][0] as VisitMember;
    expect(putArg.id).toBe(targetMember.id);
    expect(putArg.status).toBe('removed');
    expect(putArg.removedAt).toBeInstanceOf(Date);
    expect(putArg.updatedAt).toBeInstanceOf(Date);
  });

  it('retorna forbidden quando endpoint responde 403 e não grava local', async () => {
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(member('editor', 'target-user-id'));
    mockCanManageMembers.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      status: 403,
      json: () => Promise.resolve({ error: 'forbidden' }),
    });

    const result = await membersService.removeVisitMemberAsAdmin(VISIT_ID, 'target-user-id');

    expect(result.status).toBe('forbidden');
    expect(mockDb.visitMembers.put).not.toHaveBeenCalled();
  });

  it('mapeia membership-not-found (404) do endpoint para target-not-found', async () => {
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(member('editor', 'target-user-id'));
    mockCanManageMembers.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      status: 404,
      json: () => Promise.resolve({ error: 'membership-not-found' }),
    });

    const result = await membersService.removeVisitMemberAsAdmin(VISIT_ID, 'target-user-id');

    expect(result.status).toBe('target-not-found');
    expect(mockDb.visitMembers.put).not.toHaveBeenCalled();
  });

  it('propaga erro de rede', async () => {
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(member('editor', 'target-user-id'));
    mockCanManageMembers.mockReturnValue(true);
    mockFetch.mockRejectedValue(new Error('network unavailable'));

    await expect(
      membersService.removeVisitMemberAsAdmin(VISIT_ID, 'target-user-id')
    ).rejects.toThrow('network unavailable');
    expect(mockDb.visitMembers.put).not.toHaveBeenCalled();
  });

  it('lança erro quando endpoint responde 500', async () => {
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(member('editor', 'target-user-id'));
    mockCanManageMembers.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      status: 500,
      json: () => Promise.resolve({ error: 'internal-error' }),
    });

    await expect(
      membersService.removeVisitMemberAsAdmin(VISIT_ID, 'target-user-id')
    ).rejects.toThrow('Erro no servidor.');
  });
});

describe('visit-members-service - updateVisitMemberRole', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);

    mockedGetAuthState.mockReturnValue({
      user: {
        uid: CURRENT_USER_ID,
        getIdToken: vi.fn().mockResolvedValue('id-token'),
      },
      loading: false,
      error: null,
    });
    mockCanManageMembers.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retorna forbidden quando usuário atual não pode gerenciar membros', async () => {
    (mockDb.visitMembers.get).mockResolvedValue(member('editor', CURRENT_USER_ID));
    mockCanManageMembers.mockReturnValue(false);

    const result = await membersService.updateVisitMemberRole(
      VISIT_ID,
      'target-user-id',
      'admin'
    );

    expect(result.status).toBe('forbidden');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retorna cannot-update-self quando alvo é o próprio usuário', async () => {
    (mockDb.visitMembers.get).mockResolvedValue(member('admin', CURRENT_USER_ID));
    mockCanManageMembers.mockReturnValue(true);

    const result = await membersService.updateVisitMemberRole(
      VISIT_ID,
      CURRENT_USER_ID,
      'viewer'
    );

    expect(result.status).toBe('cannot-update-self');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retorna cannot-update-owner quando alvo é owner', async () => {
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(member('owner', 'target-owner-id'));
    mockCanManageMembers.mockReturnValue(true);

    const result = await membersService.updateVisitMemberRole(VISIT_ID, 'target-owner-id', 'admin');

    expect(result.status).toBe('cannot-update-owner');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('chama endpoint role e grava papel localmente em caso de 200', async () => {
    const targetMember = member('editor', 'target-user-id');
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(targetMember);
    mockCanManageMembers.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({
          status: 'updated',
          visitId: VISIT_ID,
          targetUserId: 'target-user-id',
          role: 'admin',
        }),
    });

    const result = await membersService.updateVisitMemberRole(VISIT_ID, 'target-user-id', 'admin');

    expect(result.status).toBe('updated');
    expect(result.role).toBe('admin');
    expect(result.member).toBeDefined();
    expect(result.member?.role).toBe('admin');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/visits/members/role',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer id-token',
        }) as Record<string, string>,
        body: JSON.stringify({ visitId: VISIT_ID, targetUserId: 'target-user-id', role: 'admin' }),
      })
    );

    expect(mockDb.visitMembers.put).toHaveBeenCalledTimes(1);
    const putArg = (mockDb.visitMembers.put).mock.calls[0][0] as VisitMember;
    expect(putArg.id).toBe(targetMember.id);
    expect(putArg.role).toBe('admin');
    expect(putArg.updatedAt).toBeInstanceOf(Date);
  });

  it('retorna forbidden quando endpoint responde 403', async () => {
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(member('viewer', 'target-user-id'));
    mockCanManageMembers.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      status: 403,
      json: () => Promise.resolve({ error: 'forbidden' }),
    });

    const result = await membersService.updateVisitMemberRole(VISIT_ID, 'target-user-id', 'editor');

    expect(result.status).toBe('forbidden');
    expect(mockDb.visitMembers.put).not.toHaveBeenCalled();
  });

  it('mapeia membership-not-found (404) do endpoint para target-not-found', async () => {
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(member('viewer', 'target-user-id'));
    mockCanManageMembers.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      status: 404,
      json: () => Promise.resolve({ error: 'membership-not-found' }),
    });

    const result = await membersService.updateVisitMemberRole(VISIT_ID, 'target-user-id', 'admin');

    expect(result.status).toBe('target-not-found');
    expect(mockDb.visitMembers.put).not.toHaveBeenCalled();
  });

  it('propaga erro de rede', async () => {
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(member('viewer', 'target-user-id'));
    mockCanManageMembers.mockReturnValue(true);
    mockFetch.mockRejectedValue(new Error('network unavailable'));

    await expect(
      membersService.updateVisitMemberRole(VISIT_ID, 'target-user-id', 'viewer')
    ).rejects.toThrow('network unavailable');
    expect(mockDb.visitMembers.put).not.toHaveBeenCalled();
  });

  it('lança erro quando endpoint responde resposta inválida', async () => {
    (mockDb.visitMembers.get)
      .mockResolvedValueOnce(member('admin', CURRENT_USER_ID))
      .mockResolvedValueOnce(member('viewer', 'target-user-id'));
    mockCanManageMembers.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ status: 'updated', visitId: VISIT_ID }),
    });

    await expect(
      membersService.updateVisitMemberRole(VISIT_ID, 'target-user-id', 'admin')
    ).rejects.toThrow('Resposta inválida do servidor.');
  });
});
