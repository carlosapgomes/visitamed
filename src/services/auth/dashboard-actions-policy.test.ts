/**
 * Dashboard Actions Policy Tests
 */

import { describe, it, expect } from 'vitest';
import { getDashboardGroupActions } from './dashboard-actions-policy';
import {
  canOpenParticipantsPanel,
  getParticipantRowActions,
  getParticipantDisplayName,
  getParticipantRoleLabel,
} from './dashboard-actions-policy';
import { createVisitMember, type VisitMember } from '@/models/visit-member';

function activeMember(userId: string, role: VisitMember['role']): VisitMember {
  return createVisitMember('visit-1', userId, role);
}

function removedMember(userId: string, role: VisitMember['role']): VisitMember {
  return { ...activeMember(userId, role), status: 'removed' };
}

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
      expect(deleteAction?.label).toBe('Excluir notas');
    });

    it('deve incluir rótulos corretos', () => {
      const actions = getDashboardGroupActions(true);

      expect(actions[0]).toEqual({ id: 'preview', label: 'Pré-visualizar' });
      expect(actions[1]).toEqual({ id: 'copy', label: 'Copiar mensagem' });
      expect(actions[2]).toEqual({ id: 'share', label: 'Compartilhar' });
      expect(actions[3]).toEqual({ id: 'delete', label: 'Excluir notas' });
    });
  });

  describe('canOpenParticipantsPanel', () => {
    it('deve liberar painel para owner ativo em visita group', () => {
      expect(canOpenParticipantsPanel(activeMember('u-owner', 'owner'), 'group')).toBe(true);
    });

    it('deve liberar painel para admin ativo em visita group', () => {
      expect(canOpenParticipantsPanel(activeMember('u-admin', 'admin'), 'group')).toBe(true);
    });

    it.each(['editor', 'viewer'] as const)(
      'deve negar painel para papel %s ativo em visita group',
      (role) => {
        expect(canOpenParticipantsPanel(activeMember('u-role', role), 'group')).toBe(false);
      }
    );

    it('deve negar painel para membro removido', () => {
      expect(canOpenParticipantsPanel(removedMember('u-admin', 'admin'), 'group')).toBe(false);
    });

    it('deve negar painel sem membership', () => {
      expect(canOpenParticipantsPanel(null, 'group')).toBe(false);
    });

    it('deve negar painel em visita private mesmo para owner', () => {
      expect(canOpenParticipantsPanel(activeMember('u-owner', 'owner'), 'private')).toBe(false);
    });
  });

  describe('getParticipantRowActions', () => {
    const admin = activeMember('u-admin', 'admin');
    const owner = activeMember('u-owner', 'owner');

    it('não expõe ações na linha do owner', () => {
      expect(getParticipantRowActions(owner, admin)).toEqual([]);
    });

    it('não expõe ações na linha do próprio usuário', () => {
      expect(getParticipantRowActions(admin, admin)).toEqual([]);
    });

    it('deve permitir promover e remover editor', () => {
      const actions = getParticipantRowActions(activeMember('u-editor', 'editor'), admin);

      expect(actions.map(a => a.id)).toEqual(['promote', 'remove']);
      expect(actions[0]?.label).toBe('Promover a admin');
      expect(actions[1]?.label).toBe('Remover');
    });

    it('deve permitir promover e remover viewer', () => {
      const actions = getParticipantRowActions(activeMember('u-viewer', 'viewer'), admin);

      expect(actions.map(a => a.id)).toEqual(['promote', 'remove']);
    });

    it('deve permitir rebaixar e remover admin', () => {
      const actions = getParticipantRowActions(activeMember('u-admin-2', 'admin'), admin);

      expect(actions.map(a => a.id)).toEqual(['demote', 'remove']);
      expect(actions[0]?.label).toBe('Rebaixar a editor');
      expect(actions[1]?.label).toBe('Remover');
    });

    it('deve liberar as mesmas ações para owner como gerenciador', () => {
      const actions = getParticipantRowActions(activeMember('u-editor', 'editor'), owner);

      expect(actions.map(a => a.id)).toEqual(['promote', 'remove']);
    });

    it('não expõe ações quando gerenciador é editor/viewer', () => {
      const editor = activeMember('u-editor', 'editor');

      expect(getParticipantRowActions(activeMember('u-viewer', 'viewer'), editor)).toEqual([]);
    });

    it('não expõe ações sobre membro removido', () => {
      expect(getParticipantRowActions(removedMember('u-removed', 'editor'), admin)).toEqual([]);
    });

    it('não expõe ações quando gerenciador está removido', () => {
      expect(getParticipantRowActions(activeMember('u-editor', 'editor'), removedMember('u-admin', 'admin'))).toEqual(
        []
      );
    });
  });

  describe('getParticipantDisplayName', () => {
    it('usa displayName quando presente', () => {
      const member = { ...activeMember('u-1', 'editor'), displayName: 'Maria Silva' };

      expect(getParticipantDisplayName(member)).toBe('Maria Silva');
    });

    it('faz fallback para uid truncado quando displayName é undefined', () => {
      const member = activeMember('abc123def456', 'editor');

      expect(getParticipantDisplayName(member)).toBe('abc123…');
    });

    it('faz fallback para uid truncado quando displayName é vazio', () => {
      const member = { ...activeMember('abc123def456', 'editor'), displayName: '   ' };

      expect(getParticipantDisplayName(member)).toBe('abc123…');
    });
  });

  describe('getParticipantRoleLabel', () => {
    it.each([
      ['owner', 'dono'],
      ['admin', 'admin'],
      ['editor', 'editor'],
      ['viewer', 'viewer'],
    ] as const)('mapeia papel %s para rótulo %s', (role, label) => {
      expect(getParticipantRoleLabel(role)).toBe(label);
    });
  });
});
