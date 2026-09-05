/**
 * VisitaMed Environment Configuration
 * Configurações de ambiente e Firebase
 *
 * A configuração web do Firebase é resolvida em build time pelas variáveis
 * Vite `VITE_FIREBASE_*` (ver `.env.staging`, modo `--mode staging`). Sem as
 * variáveis definidas, vale o fallback com a configuração de produção — o
 * build padrão (`npm run build`) continua apontando para o mesmo projeto.
 */

/**
 * Configuração web do Firebase do projeto de produção (fallback padrão).
 */
const productionFirebase = {
  apiKey: 'AIzaSyBFKwT8khsv2_z_aQxV0p-zY-QT0ybLkLI',
  authDomain: 'visita.med.br',
  projectId: 'visitamed-36570',
  storageBucket: 'visitamed-36570.firebasestorage.app',
  messagingSenderId: '393253441468',
  appId: '1:393253441468:web:dbdfbea755af69f37865b9',
};

export const config = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? productionFirebase.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? productionFirebase.authDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? productionFirebase.projectId,
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? productionFirebase.storageBucket,
    messagingSenderId:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? productionFirebase.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? productionFirebase.appId,
    // measurementId/analytics não é usado no client hoje e não é exposto
    // como VITE_* (design D3); mantido como literal de produção.
    measurementId: 'G-VZNYHES84C',
  },
  app: {
    name: 'VisitaMed',
    version: '0.1.0',
    noteExpirationDays: 14,
  },
} as const;

/**
 * Valida se a config efetiva do Firebase permite inicializar o app
 * (apiKey + projectId + appId presentes e não vazios).
 */
export function isFirebaseConfigured(): boolean {
  const { apiKey, projectId, appId } = config.firebase;
  return apiKey !== '' && projectId !== '' && appId !== '';
}
