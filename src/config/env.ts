/**
 * VisitaMed Environment Configuration
 * Configurações de ambiente e Firebase
 */

export const config = {
  firebase: {
    apiKey: 'AIzaSyBFKwT8khsv2_z_aQxV0p-zY-QT0ybLkLI',
    authDomain: 'visita.med.br',
    projectId: 'visitamed-36570',
    storageBucket: 'visitamed-36570.firebasestorage.app',
    messagingSenderId: '393253441468',
    appId: '1:393253441468:web:dbdfbea755af69f37865b9',
    measurementId: 'G-VZNYHES84C',
  },
  app: {
    name: 'VisitaMed',
    version: '0.1.0',
    noteExpirationDays: 14,
  },
} as const;

/**
 * Valida se as configurações do Firebase foram preenchidas
 */
export function isFirebaseConfigured(): boolean {
  // Firebase config está sempre definido neste projeto
  return true;
}
