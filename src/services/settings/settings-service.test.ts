import { describe, expect, it } from 'vitest';
import {
  applyInputCase,
} from './settings-service';

describe('settings-service - applyInputCase', () => {
  it('converte para maiúsculas quando habilitado', () => {
    expect(applyInputCase('leito 1', true)).toBe('LEITO 1');
  });

  it('preserva texto digitado quando desabilitado', () => {
    expect(applyInputCase('LeItO 1', false)).toBe('LeItO 1');
  });
});

// Removidos: applyWardPreferencesToLabels, buildWardSuggestionItems (tags-first)
