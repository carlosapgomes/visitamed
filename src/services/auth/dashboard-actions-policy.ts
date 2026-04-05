/**
 * Dashboard Actions Policy
 * Funções puras para definir quais ações estão disponíveis no action sheet do dashboard
 */

/** Ação disponível no action sheet */
export interface DashboardAction {
  id: string;
  label: string;
}

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
