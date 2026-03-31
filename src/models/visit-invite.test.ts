/**
 * Testes para visit-invite model e helpers
 */

import { describe, it, expect } from 'vitest';
import {
  createVisitInvite,
  isInviteExpired,
  isInviteRevoked,
  isInviteActive,
  revokeInvite,
} from '@/models/visit-invite';

describe('visit-invite - createVisitInvite', () => {
  it('cria convite com expiração padrão de 24h', () => {
    const now = new Date();
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
    });

    expect(invite.visitId).toBe('v1');
    expect(invite.createdByUserId).toBe('u1');
    expect(invite.role).toBe('editor');
    expect(invite.id).toBeDefined();
    expect(invite.token).toBeDefined();
    expect(invite.expiresAt.getTime()).toBeGreaterThan(now.getTime());
    
    // Verifica que expiração é aproximadamente 24h
    const diffHours = (invite.expiresAt.getTime() - invite.createdAt.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(24, 0);
  });

  it('cria convite com expiração customizada', () => {
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'viewer',
      expiresInHours: 48,
    });

    const diffHours = (invite.expiresAt.getTime() - invite.createdAt.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(48, 0);
  });

  it('gera token e id aleatórios', () => {
    const invite1 = createVisitInvite({ visitId: 'v1', createdByUserId: 'u1', role: 'editor' });
    const invite2 = createVisitInvite({ visitId: 'v1', createdByUserId: 'u1', role: 'editor' });

    expect(invite1.id).not.toBe(invite2.id);
    expect(invite1.token).not.toBe(invite2.token);
  });
});

describe('visit-invite - isInviteExpired', () => {
  it('retorna false quando convite não expirou', () => {
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
      expiresInHours: 24,
    });

    expect(isInviteExpired(invite)).toBe(false);
  });

  it('retorna true quando convite expirou', () => {
    const pastDate = new Date(Date.now() - 1000);
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
    });
    
    // Simula convite expirado modificando expiresAt
    const expiredInvite = { ...invite, expiresAt: pastDate };
    
    expect(isInviteExpired(expiredInvite)).toBe(true);
  });

  it('aceita custom now parameter', () => {
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
    });

    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h no futuro
    expect(isInviteExpired(invite, futureDate)).toBe(true);
  });
});

describe('visit-invite - isInviteRevoked', () => {
  it('retorna false para convite não revogado', () => {
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
    });

    expect(isInviteRevoked(invite)).toBe(false);
  });

  it('retorna true para convite revogado', () => {
    const revokedInvite = revokeInvite(
      createVisitInvite({ visitId: 'v1', createdByUserId: 'u1', role: 'editor' })
    );

    expect(isInviteRevoked(revokedInvite)).toBe(true);
  });
});

describe('visit-invite - isInviteActive', () => {
  it('retorna true para convite válido', () => {
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
    });

    expect(isInviteActive(invite)).toBe(true);
  });

  it('retorna false quando convite expirado', () => {
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
    });

    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48);
    expect(isInviteActive(invite, futureDate)).toBe(false);
  });

  it('retorna false quando convite revogado', () => {
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
    });

    const revokedInvite = revokeInvite(invite);
    expect(isInviteActive(revokedInvite)).toBe(false);
  });

  it('retorna false quando convite expirado e revogado', () => {
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
    });

    const revokedInvite = revokeInvite(invite);
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48);
    expect(isInviteActive(revokedInvite, futureDate)).toBe(false);
  });
});

describe('visit-invite - revokeInvite', () => {
  it('retorna novo objeto com revokedAt preenchido', () => {
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
    });

    const revokedInvite = revokeInvite(invite);

    expect(revokedInvite.id).toBe(invite.id);
    expect(revokedInvite.revokedAt).toBeDefined();
    expect(revokedInvite.updatedAt).toEqual(revokedInvite.revokedAt);
  });

  it('não modifica o objeto original', () => {
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
    });

    revokeInvite(invite);

    expect(invite.revokedAt).toBeUndefined();
  });

  it('aceita data customizada para revogação', () => {
    const invite = createVisitInvite({
      visitId: 'v1',
      createdByUserId: 'u1',
      role: 'editor',
    });

    const customDate = new Date('2024-01-15T10:00:00Z');
    const revokedInvite = revokeInvite(invite, customDate);

    expect(revokedInvite.revokedAt).toEqual(customDate);
    expect(revokedInvite.updatedAt).toEqual(customDate);
  });
});
