/**
 * Testes para visit model - geração de nome de visita privada
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generatePrivateVisitName,
  getCurrentDate,
  createVisit,
  normalizeLegacyPrivateVisitName,
} from '@/models/visit';

describe('visit - generatePrivateVisitName', () => {
  it('deve gerar nome padrão sem prefixo', () => {
    const name = generatePrivateVisitName();

    expect(name).toBe('Visita');
  });

  it('deve gerar nome com prefixo personalizado', () => {
    const name = generatePrivateVisitName('UTI');

    expect(name).toBe('UTI');
  });

  it('deve gerar nome com prefixo contendo espaços', () => {
    const name = generatePrivateVisitName('Ala A');

    expect(name).toBe('Ala A');
  });

  it('deve ignorar prefixo vazio', () => {
    const name = generatePrivateVisitName('');

    expect(name).toBe('Visita');
  });

  it('deve ignorar prefixo com apenas espaços', () => {
    const name = generatePrivateVisitName('   ');

    expect(name).toBe('Visita');
  });

  it('deve fazer trim no prefixo', () => {
    const name = generatePrivateVisitName('  UTI  ');

    expect(name).toBe('UTI');
  });
});

describe('visit - normalizeLegacyPrivateVisitName', () => {
  it('normaliza formato legado simples', () => {
    expect(normalizeLegacyPrivateVisitName('HMH 01-04-2026 privada')).toBe('HMH');
  });

  it('normaliza formato legado com sufixo incremental', () => {
    expect(normalizeLegacyPrivateVisitName('Plantão manhã 01-04-2026 privada (3)')).toBe('Plantão manhã');
  });

  it('mantém nome arbitrário fora do padrão legado', () => {
    expect(normalizeLegacyPrivateVisitName('Caso privada enfermaria')).toBe('Caso privada enfermaria');
  });

  it('mantém nome quando formato de data não bate padrão legado', () => {
    expect(normalizeLegacyPrivateVisitName('Visita 2026-04-01 privada')).toBe('Visita 2026-04-01 privada');
  });
});

describe('visit - getCurrentDate', () => {
  it('deve retornar data no formato YYYY-MM-DD', () => {
    const mockDate = new Date('2024-03-15T10:30:00');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    const date = getCurrentDate();

    expect(date).toBe('2024-03-15');

    vi.useRealTimers();
  });
});

describe('visit - createVisit', () => {
  it('deve criar visita com valores padrão', () => {
    const mockDate = new Date('2024-03-15T10:30:00');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    const visit = createVisit({ userId: 'user-123', name: 'Teste' });

    expect(visit.id).toBeDefined();
    expect(visit.userId).toBe('user-123');
    expect(visit.name).toBe('Teste');
    expect(visit.date).toBe('2024-03-15');
    expect(visit.mode).toBe('private');
    expect(visit.createdAt).toBeInstanceOf(Date);
    expect(visit.expiresAt).toBeInstanceOf(Date);
    expect(visit.expiresAt.toISOString().split('T')[0]).toBe('2024-03-29');

    vi.useRealTimers();
  });

  it('deve permitir sobrescrever mode', () => {
    const visit = createVisit({ userId: 'user-123', mode: 'group' });

    expect(visit.mode).toBe('group');
  });
});
