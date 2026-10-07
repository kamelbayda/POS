import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  connectAuthEmulator,
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  enableNetwork,
  disableNetwork,
  doc,
  collection,
  getDocFromServer,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { FIREBASE_APP_NAME } from './lib/shops';

// One Firebase app per shop on this browser: its own cloud sign-in and offline cache
const app = initializeApp(firebaseConfig, FIREBASE_APP_NAME);

// Initialize Firestore with Offline Persistence enabled for concurrent Offline/Online operations
export const db = initializeFirestore(app, {
  // Records often carry optional fields set to undefined (e.g. an invoice without a customer);
  // Firestore rejects those unless told to drop them
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);

// Initialize Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Local development against the Firebase emulators (firebase emulators:start)
if (import.meta.env.VITE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

/**
 * Every shop's cloud data lives under shops/{uid}/..., where uid is the signed-in
 * Firebase Auth user. firestore.rules only lets that user read or write there.
 */
function currentShopId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in to cloud sync');
  return uid;
}
export const shopCollection = (name: string) => collection(db, 'shops', currentShopId(), name);
export const shopDoc = (name: string, id: string) => doc(db, 'shops', currentShopId(), name, id);

// Firestore error profiling as requested by system rules
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation function validating connection
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test_connection', 'ping'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("Client offline. Working in offline local sync mode.");
    }
    return false;
  }
}

// Allow toggling connection network manually (useful for demonstration and control)
export async function toggleNetwork(goOnline: boolean) {
  try {
    if (goOnline) {
      await enableNetwork(db);
    } else {
      await disableNetwork(db);
    }
    return true;
  } catch (err) {
    console.error("Network state switch error:", err);
    return false;
  }
}
