/**
 * Testes para visits-service - validação de criação de visitas e membership
 */

import { describe, it, expect } from 'vitest';
import { createOwnerVisitMember } from './visit-members-service';

describe('visit-members-service - createOwnerVisitMember', () => {
  it('deve criar membership com role owner', () => {
    const visitId = 'visit-123';
    const userId = 'user-456';

    const member = createOwnerVisitMember(visitId, userId);

    expect(member.visitId).toBe(visitId);
    expect(member.userId).toBe(userId);
    expect(member.role).toBe('owner');
    expect(member.status).toBe('active');
    expect(member.id).toBe(`${visitId}:${userId}`);
  });

  it('deve criar membership com datas definidas', () => {
    const member = createOwnerVisitMember('visit-1', 'user-1');

    expect(member.createdAt).toBeInstanceOf(Date);
    expect(member.updatedAt).toBeInstanceOf(Date);
    expect(member.createdAt.getTime()).toBe(member.updatedAt.getTime());
  });
});

describe('visits-service - createPrivateVisit integration', () => {
  // Este teste verifica que a lógica de criação de membership está correta
  // A integração real com Dexie seria testada com mocks mais elaborate

  it('deve gerar ID de membership correto para owner', () => {
    const visitId = 'visit-abc123';
    const userId = 'user-xyz789';

    const ownerMember = createOwnerVisitMember(visitId, userId);

    // O ID deve seguir o padrão visitId:userId
    expect(ownerMember.id).toBe('visit-abc123:user-xyz789');
  });
});
