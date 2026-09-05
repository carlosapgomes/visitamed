/**
 * Dashboard Actions Policy
 * Funções puras para definir quais ações estão disponíveis no action sheet do dashboard
 */

import type { VisitMember, VisitRole } from '@/models/visit-member';
import type { Visit } from '@/models/visit';

/** Ação disponível no action sheet */
export interface DashboardAction {
  id: string;
  label: string;
}

/**
 * Ação de gerência disponível em uma linha do painel de participantes
 */
export interface ParticipantRowAction {
  id: 'promote' | 'demote' | 'remove';
  label: string;
}

/** Tamanho do prefixo do uid exibido quando não há displayName */
const UID_PREFIX_LENGTH = 6;

/**
 * Retorna as ações disponíveis para o action sheet de grupos no dashboard
 * @param canDelete - se o usuário pode deletar notas
 * @returns array de ações disponíveis
 */
export function getDashboardGroupActions(canDelete: boolean): DashboardAction[] {
  const baseActions: DashboardAction[] = [
    { id: 'preview', label: 'Pré-visualizar' },
    { id: 'copy', label: 'Copiar mensagem' },
    { id: 'share', label: 'Compartilhar' },
  ];

  if (canDelete) {
    baseActions.push({ id: 'delete', label: 'Excluir notas' });
  }

  return baseActions;
}

/**
 * Define se o painel de participantes está disponível para o usuário:
 * apenas owner/admin ativos em visitas em modo grupo (R1/R5).
 * @param member - membership do usuário atual (null quando sem membership)
 * @param mode - modo da visita
 * @returns true quando o painel deve ser exibido
 */
export function canOpenParticipantsPanel(member: VisitMember | null, mode: Visit['mode']): boolean {
  if (!member || member.status !== 'active') {
    return false;
  }

  if (mode !== 'group') {
    return false;
  }

  return member.role === 'owner' || member.role === 'admin';
}

/**
 * Ações de gerência para uma linha do painel de participantes (R3).
 * Linha do owner e linha do próprio usuário não têm ações.
 * Demais membros ativos podem ser removidos; editor/viewer promovidos;
 * admin rebaixado a editor.
 * @param target - membro da linha (alvo da ação)
 * @param currentMember - membership do usuário que abriu o painel
 * @returns ações disponíveis (vazio quando não há nenhuma)
 */
export function getParticipantRowActions(
  target: VisitMember,
  currentMember: VisitMember
): ParticipantRowAction[] {
  if (currentMember.status !== 'active') {
    return [];
  }

  const isManager = currentMember.role === 'owner' || currentMember.role === 'admin';

  if (!isManager) {
    return [];
  }

  // Owner intocável e auto-gerência são feitas por "Sair da visita"
  if (target.role === 'owner' || target.userId === currentMember.userId) {
    return [];
  }

  if (target.status !== 'active') {
    return [];
  }

  const actions: ParticipantRowAction[] = [];

  if (target.role === 'admin') {
    actions.push({ id: 'demote', label: 'Rebaixar a editor' });
  } else {
    actions.push({ id: 'promote', label: 'Promover a admin' });
  }

  actions.push({ id: 'remove', label: 'Remover' });

  return actions;
}

/**
 * Nome de exibição de um participante para o painel:
 * displayName quando presente; senão uid truncado (prefixo + …) (R2/D7).
 */
export function getParticipantDisplayName(member: VisitMember): string {
  const displayName = member.displayName?.trim();

  if (displayName) {
    return displayName;
  }

  if (member.userId.length <= UID_PREFIX_LENGTH) {
    return member.userId;
  }

  return `${member.userId.slice(0, UID_PREFIX_LENGTH)}…`;
}

/**
 * Rótulo em pt-BR do papel para exibição no badge do painel (R2).
 */
export function getParticipantRoleLabel(role: VisitRole): string {
  switch (role) {
    case 'owner':
      return 'dono';
    case 'admin':
      return 'admin';
    case 'editor':
      return 'editor';
    case 'viewer':
      return 'viewer';
  }
}
