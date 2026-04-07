import { describe, expect, it, vi } from 'vitest';
import { clearLocalUserDataFromDb } from './dexie-db';

describe('clearLocalUserDataFromDb', () => {
  it('também remove userTagStats', async () => {
    const notesClear = vi.fn(() => Promise.resolve());
    const settingsClear = vi.fn(() => Promise.resolve());
    const syncQueueClear = vi.fn(() => Promise.resolve());
    const visitsClear = vi.fn(() => Promise.resolve());
    const visitMembersClear = vi.fn(() => Promise.resolve());
    const visitInvitesClear = vi.fn(() => Promise.resolve());
    const userTagStatsClear = vi.fn(() => Promise.resolve());

    const mockDb = {
      notes: { clear: notesClear },
      settings: { clear: settingsClear },
      syncQueue: { clear: syncQueueClear },
      visits: { clear: visitsClear },
      visitMembers: { clear: visitMembersClear },
      visitInvites: { clear: visitInvitesClear },
      userTagStats: { clear: userTagStatsClear },
      transaction: vi.fn(async (_mode: string, _tables: unknown[], callback: () => Promise<void>) => {
        await callback();
      }),
    };

    await clearLocalUserDataFromDb(mockDb);

    expect(notesClear).toHaveBeenCalledTimes(1);
    expect(settingsClear).toHaveBeenCalledTimes(1);
    expect(syncQueueClear).toHaveBeenCalledTimes(1);
    expect(visitsClear).toHaveBeenCalledTimes(1);
    expect(visitMembersClear).toHaveBeenCalledTimes(1);
    expect(visitInvitesClear).toHaveBeenCalledTimes(1);
    expect(userTagStatsClear).toHaveBeenCalledTimes(1);
  });
});
