/**
 * ZenvX - Calculator
 * File: js/core/db-local.js
 * Purpose: Offline-first IndexedDB storage engine (Web equivalent of Hive) with
 *          automatic LocalStorage fallback for Normal/Scientific history, AI cache,
 *          offline solver queue, and user creations.
 */

const DB_NAME = 'zenvx_calculator_db';
const DB_VERSION = 1;

export const STORES = {
  NORMAL_HISTORY: 'normal_history',
  SCI_HISTORY: 'sci_history',
  SCI_MEMORY: 'sci_memory',
  AI_CACHE: 'ai_cache',
  AI_HISTORY: 'ai_history',
  OFFLINE_QUEUE: 'offline_queue',
  CREATIONS: 'creations',
  DRAFTS: 'drafts'
};

class LocalDatabase {
  constructor() {
    this.dbPromise = null;
  }

  /**
   * Open and initialize IndexedDB stores
   */
  open() {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        });
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });

    return this.dbPromise;
  }

  /**
   * Save or update an item in a store
   */
  async put(storeName, item) {
    const record = {
      ...item,
      id: item.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: item.timestamp || Date.now()
    };

    try {
      const db = await this.open();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(record);
        req.onsuccess = () => resolve(record);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      // Fallback to localStorage if IndexedDB is blocked in private mode
      const fallbackKey = `${DB_NAME}_${storeName}`;
      const list = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
      const idx = list.findIndex((x) => x.id === record.id);
      if (idx >= 0) list[idx] = record;
      else list.unshift(record);
      localStorage.setItem(fallbackKey, JSON.stringify(list.slice(0, 200)));
      return record;
    }
  }

  /**
   * Retrieve all items from a store sorted newest first
   */
  async getAll(storeName, limit = 100) {
    try {
      const db = await this.open();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => {
          const sorted = (req.result || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          resolve(sorted.slice(0, limit));
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      const fallbackKey = `${DB_NAME}_${storeName}`;
      const list = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
      return list.slice(0, limit);
    }
  }

  /**
   * Get a single item by its ID
   */
  async getById(storeName, id) {
    try {
      const db = await this.open();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      const fallbackKey = `${DB_NAME}_${storeName}`;
      const list = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
      return list.find((x) => x.id === id) || null;
    }
  }

  /**
   * Delete a specific item by ID
   */
  async delete(storeName, id) {
    try {
      const db = await this.open();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      const fallbackKey = `${DB_NAME}_${storeName}`;
      const list = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
      const filtered = list.filter((x) => x.id !== id);
      localStorage.setItem(fallbackKey, JSON.stringify(filtered));
      return true;
    }
  }

  /**
   * Clear an entire object store
   */
  async clearStore(storeName) {
    try {
      const db = await this.open();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      localStorage.removeItem(`${DB_NAME}_${storeName}`);
      return true;
    }
  }
}

export const localDB = new LocalDatabase();
