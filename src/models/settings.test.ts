import { describe, expect, it } from 'vitest';
import {
  createSettings,
  normalizeSettings,
  SETTINGS_ID,
  DEFAULT_INPUT_PREFERENCES,
} from './settings';

describe('settings - createSettings', () => {
  it('cria configurações com defaults esperados', () => {
    const settings = createSettings('user-123');

    expect(settings.id).toBe(SETTINGS_ID);
    expect(settings.userId).toBe('user-123');
    expect(settings.inputPreferences).toEqual(DEFAULT_INPUT_PREFERENCES);
    expect(settings.updatedAt).toBeInstanceOf(Date);
  });
});

describe('settings - normalizeSettings', () => {
  it('aplica defaults quando payload é inválido', () => {
    const settings = normalizeSettings(null, 'user-123');

    expect(settings.id).toBe(SETTINGS_ID);
    expect(settings.userId).toBe('user-123');
    expect(settings.inputPreferences.uppercaseBed).toBe(true);
  });

  it('normaliza inputPreferences e ignora campos legados', () => {
    const settings = normalizeSettings(
      {
        inputPreferences: {
          uppercaseBed: false,
        },
        wardPreferences: {
          hiddenWardKeys: ['UTI'],
        },
        updatedAt: '2026-03-28T10:00:00.000Z',
      },
      'user-123'
    );

    expect(settings.inputPreferences.uppercaseBed).toBe(false);
    expect(settings.updatedAt.toISOString()).toBe('2026-03-28T10:00:00.000Z');
  });
});
