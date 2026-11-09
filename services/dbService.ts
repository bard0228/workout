
import { WorkoutHistoryEntry, Exercise, Combo } from '../types';

const DB_NAME = 'ProWorkoutDB';
const DB_VERSION = 1;
const STORES = {
  HISTORY: 'history',
  EXERCISES: 'exercises',
  COMBOS: 'combos'
};

export class DbService {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // 建立儲存空間
        if (!db.objectStoreNames.contains(STORES.HISTORY)) {
          db.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.EXERCISES)) {
          db.createObjectStore(STORES.EXERCISES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.COMBOS)) {
          db.createObjectStore(STORES.COMBOS, { keyPath: 'id' });
        }
      };
    });
  }

  // 泛型取得所有資料
  private async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 泛型批量儲存（清空舊有再存入，以保持與 App State 同步）
  private async saveAll<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        items.forEach(item => store.add(item));
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // 公開介面
  async getHistory(): Promise<WorkoutHistoryEntry[]> { return this.getAll(STORES.HISTORY); }
  async getExercises(): Promise<Exercise[]> { return this.getAll(STORES.EXERCISES); }
  async getCombos(): Promise<Combo[]> { return this.getAll(STORES.COMBOS); }

  async saveHistory(items: WorkoutHistoryEntry[]) { return this.saveAll(STORES.HISTORY, items); }
  async saveExercises(items: Exercise[]) { return this.saveAll(STORES.EXERCISES, items); }
  async saveCombos(items: Combo[]) { return this.saveAll(STORES.COMBOS, items); }
}

export const db = new DbService();
