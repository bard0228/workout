import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getDocsFromCache,
  getDocsFromServer,
  where,
  doc, 
  setDoc, 
  getDocs, 
  collection, 
  writeBatch,
  deleteDoc,
  getDocFromServer,
  query,
  limit
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { WorkoutHistoryEntry, Exercise, Combo } from '../types';

// Initialize
const app = initializeApp(firebaseConfig);
// 離線快取（多分頁），之後開 App 先讀快取、再只抓有變動的文件
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
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
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Logic for Google login
export async function logInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-in failed', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export interface MergeResult {
  history: WorkoutHistoryEntry[];
  exercises: Exercise[];
  combos: Combo[];
}


export async function uploadHistoryEntry(userId: string, entry: WorkoutHistoryEntry) {
  try {
    await setDoc(doc(db, `users/${userId}/history`, entry.id), { ...removeUndefined(entry), updatedAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/history/${entry.id}`);
  }
}

export async function uploadExercise(userId: string, entry: Exercise) {
  try {
    await setDoc(doc(db, `users/${userId}/exercises`, entry.id), { ...removeUndefined(entry), updatedAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/exercises/${entry.id}`);
  }
}

export async function uploadCombo(userId: string, entry: Combo) {
  try {
    await setDoc(doc(db, `users/${userId}/combos`, entry.id), { ...removeUndefined(entry), updatedAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/combos/${entry.id}`);
  }
}

export async function deleteHistoryEntry(userId: string, id: string) {
  try {
    await deleteDoc(doc(db, `users/${userId}/history`, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/history/${id}`);
  }
}

export async function deleteExercise(userId: string, id: string) {
  try {
    await deleteDoc(doc(db, `users/${userId}/exercises`, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/exercises/${id}`);
  }
}

export async function deleteCombo(userId: string, id: string) {
  try {
    await deleteDoc(doc(db, `users/${userId}/combos`, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/combos/${id}`);
  }
}

// 增量讀取：有本機快取且記得上次同步時間時，只向伺服器查詢 updatedAt 之後有變動的文件
async function loadCollection<T>(userId: string, name: string, since: string | null): Promise<T[]> {
  const ref = collection(db, `users/${userId}/${name}`);
  try {
    if (since) {
      const cached = await getDocsFromCache(ref);
      if (!cached.empty) {
        await getDocsFromServer(query(ref, where('updatedAt', '>', since))); // 更新快取
        const merged = await getDocsFromCache(ref);
        return merged.docs.map(d => d.data() as T);
      }
    }
    const snap = await getDocs(ref);
    return snap.docs.map(d => d.data() as T);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/${name}`);
    return [];
  }
}

export async function downloadBackup(userId: string): Promise<MergeResult> {
  const key = `fit_fs_last_sync_${userId}`;
  const since = localStorage.getItem(key);
  const startedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 預留時鐘誤差
  const [history, exercises, combos] = await Promise.all([
    loadCollection<WorkoutHistoryEntry>(userId, 'history', since),
    loadCollection<Exercise>(userId, 'exercises', since),
    loadCollection<Combo>(userId, 'combos', since),
  ]);
  localStorage.setItem(key, startedAt);
  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { history, exercises, combos };
}

export function removeUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  
  const newObj: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      newObj[key] = removeUndefined(obj[key]);
    }
  }
  return newObj;
}
