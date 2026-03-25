/**
 * WardFlow Environment Configuration
 * Configurações de ambiente e Firebase
 *
 * IMPORTANTE: Substitua os placeholders pelos valores reais do seu projeto Firebase
 */

export const config = {
  firebase: {
    apiKey: 'FIREBASE_API_KEY_PLACEHOLDER',
    authDomain: 'FIREBASE_AUTH_DOMAIN_PLACEHOLDER',
    projectId: 'FIREBASE_PROJECT_ID_PLACEHOLDER',
    storageBucket: 'FIREBASE_STORAGE_BUCKET_PLACEHOLDER',
    messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID_PLACEHOLDER',
    appId: 'FIREBASE_APP_ID_PLACEHOLDER',
  },
  app: {
    name: 'WardFlow',
    version: '0.1.0',
    noteExpirationDays: 14,
  },
} as const;

/**
 * Valida se as configurações do Firebase foram preenchidas
 */
export function isFirebaseConfigured(): boolean {
  const { firebase } = config;
  return (
    firebase.apiKey !== 'FIREBASE_API_KEY_PLACEHOLDER' &&
    firebase.authDomain !== 'FIREBASE_AUTH_DOMAIN_PLACEHOLDER' &&
    firebase.projectId !== 'FIREBASE_PROJECT_ID_PLACEHOLDER'
  );
}
