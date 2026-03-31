/**
 * Dashboard Actions Policy Tests
 */

import { describe, it, expect } from 'vitest';
import { getDashboardGroupActions } from './dashboard-actions-policy';

describe('dashboard-actions-policy', () => {
  describe('getDashboardGroupActions', () => {
    it('deve retornar 3 ações quando usuário não pode deletar', () => {
      const actions = getDashboardGroupActions(false);

      expect(actions).toHaveLength(3);
      expect(actions.map(a => a.id)).toEqual(['preview', 'copy', 'share']);
    });

    it('deve retornar 4 ações quando usuário pode deletar', () => {
      const actions = getDashboardGroupActions(true);

      expect(actions).toHaveLength(4);
      expect(actions.map(a => a.id)).toEqual(['preview', 'copy', 'share', 'delete']);
    });

    it('deve incluir ação delete quando canDelete é true', () => {
      const actions = getDashboardGroupActions(true);

      const deleteAction = actions.find(a => a.id === 'delete');
      expect(deleteAction).toBeDefined();
      expect(deleteAction?.label).toBe('Excluir');
    });

    it('deve incluir rótulos corretos', () => {
      const actions = getDashboardGroupActions(true);

      expect(actions[0]).toEqual({ id: 'preview', label: 'Pré-visualizar' });
      expect(actions[1]).toEqual({ id: 'copy', label: 'Copiar mensagem' });
      expect(actions[2]).toEqual({ id: 'share', label: 'Compartilhar' });
      expect(actions[3]).toEqual({ id: 'delete', label: 'Excluir' });
    });
  });
});
