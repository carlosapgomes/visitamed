/**
 * WardFlow Firebase Configuration
 * Inicialização do Firebase App
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { config, isFirebaseConfigured } from '@/config/env';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

/**
 * Inicializa o Firebase (lazy initialization)
 */
export function initializeFirebase(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    console.warn('[WardFlow] Firebase não configurado. Configure as credenciais em src/config/env.ts');
    return null;
  }

  if (app) {
    return app;
  }

  app = initializeApp(config.firebase);
  auth = getAuth(app);
  firestore = getFirestore(app);

  return app;
}

/**
 * Obtém a instância do Firebase App
 */
export function getFirebaseApp(): FirebaseApp | null {
  return app;
}

/**
 * Obtém a instância do Firebase Auth
 */
export function getFirebaseAuth(): Auth | null {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

/**
 * Obtém a instância do Firestore
 */
export function getFirebaseFirestore(): Firestore | null {
  if (!firestore) {
    initializeFirebase();
  }
  return firestore;
}
