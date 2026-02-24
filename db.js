/**
 * db.js - IndexedDB Wrapper for Fisiota ERM
 * Handles storage for patients, assessments, appointments, expenses, and users.
 */
const DB_NAME = 'FisiotaERM';
const DB_VERSION = 2;
const STORES = ['patients', 'assessments', 'appointments', 'expenses', 'users', 'config', 'packages'];

const db = {
    _db: null,

    async init() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                STORES.forEach(store => {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store, { keyPath: 'id' });
                    }
                });
                // Config store is unique (id: 'global')
            };

            request.onsuccess = (e) => {
                this._db = e.target.result;
                resolve(this._db);
            };

            request.onerror = (e) => reject('Database error: ' + e.target.errorCode);
        });
    },

    async save(store, data) {
        const database = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);

            // If array, put each. If object, put one.
            if (Array.isArray(data)) {
                data.forEach(item => objectStore.put(item));
            } else {
                objectStore.put(data);
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e);
        });
    },

    async getAll(store) {
        const database = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([store], 'readonly');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e);
        });
    },

    async delete(store, id) {
        const database = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    },

    async clear(store) {
        const database = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.clear();

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }
};

window.fisiotaDB = db;
