// IndexedDB for enhanced offline storage
// Updated: Renamed 'db' to 'indexedDB_db' to avoid conflict with Firestore
// Version: 2.0 - Fixed db variable conflict

const DB_NAME = 'pharmacy-logistics';
const DB_VERSION = 1;
const STORES = {
  MEDICINES: 'medicines',
  TRANSACTIONS: 'transactions',
  ALERTS: 'alerts',
  OFFLINE_QUEUE: 'offlineQueue'
};

let indexedDB_db = null; // Renamed to avoid conflict with Firestore 'db'

// Initialize IndexedDB
async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      indexedDB_db = request.result;
      resolve(indexedDB_db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Medicines store
      if (!database.objectStoreNames.contains(STORES.MEDICINES)) {
        const medicineStore = database.createObjectStore(STORES.MEDICINES, { keyPath: 'id' });
        medicineStore.createIndex('name', 'name', { unique: false });
        medicineStore.createIndex('batch', 'batch', { unique: false });
        medicineStore.createIndex('status', 'status', { unique: false });
      }

      // Transactions store
      if (!database.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const transactionStore = database.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id', autoIncrement: true });
        transactionStore.createIndex('medicineId', 'medicineId', { unique: false });
        transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Alerts store
      if (!database.objectStoreNames.contains(STORES.ALERTS)) {
        const alertStore = database.createObjectStore(STORES.ALERTS, { keyPath: 'id' });
        alertStore.createIndex('medicineId', 'medicineId', { unique: false });
        alertStore.createIndex('type', 'type', { unique: false });
      }

      // Offline queue store
      if (!database.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        const queueStore = database.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Save medicines to IndexedDB
async function saveMedicinesToIndexedDB(medicines) {
  if (!indexedDB_db) await initIndexedDB();
  
  return new Promise((resolve, reject) => {
    const transaction = indexedDB_db.transaction([STORES.MEDICINES], 'readwrite');
    const store = transaction.objectStore(STORES.MEDICINES);
    
    // Clear existing data
    store.clear().onsuccess = () => {
      // Add all medicines
      const promises = medicines.map(medicine => {
        return new Promise((res, rej) => {
          const request = store.put(medicine);
          request.onsuccess = () => res();
          request.onerror = () => rej(request.error);
        });
      });
      
      Promise.all(promises).then(() => {
        resolve();
      }).catch(reject);
    };
  });
}

// Get medicines from IndexedDB
async function getMedicinesFromIndexedDB() {
  if (!indexedDB_db) await initIndexedDB();
  
  return new Promise((resolve, reject) => {
    const transaction = indexedDB_db.transaction([STORES.MEDICINES], 'readonly');
    const store = transaction.objectStore(STORES.MEDICINES);
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Save transaction to IndexedDB
async function saveTransactionToIndexedDB(transaction) {
  if (!indexedDB_db) await initIndexedDB();
  
  return new Promise((resolve, reject) => {
    const transaction_db = indexedDB_db.transaction([STORES.TRANSACTIONS], 'readwrite');
    const store = transaction_db.objectStore(STORES.TRANSACTIONS);
    
    const request = store.add({
      ...transaction,
      timestamp: transaction.timestamp || new Date().toISOString(),
      synced: false
    });
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get unsynced transactions
async function getUnsyncedTransactions() {
  if (!indexedDB_db) await initIndexedDB();
  
  return new Promise((resolve, reject) => {
    const transaction = indexedDB_db.transaction([STORES.TRANSACTIONS], 'readonly');
    const store = transaction.objectStore(STORES.TRANSACTIONS);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const unsynced = request.result.filter(t => !t.synced);
      resolve(unsynced);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Mark transaction as synced
async function markTransactionSynced(transactionId) {
  if (!indexedDB_db) await initIndexedDB();
  
  return new Promise((resolve, reject) => {
    const transaction = indexedDB_db.transaction([STORES.TRANSACTIONS], 'readwrite');
    const store = transaction.objectStore(STORES.TRANSACTIONS);
    const request = store.get(transactionId);
    
    request.onsuccess = () => {
      const transaction = request.result;
      if (transaction) {
        transaction.synced = true;
        const updateRequest = store.put(transaction);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Save offline queue item
async function saveOfflineQueueItem(item) {
  if (!indexedDB_db) await initIndexedDB();
  
  return new Promise((resolve, reject) => {
    const transaction = indexedDB_db.transaction([STORES.OFFLINE_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.OFFLINE_QUEUE);
    
    const request = store.add({
      ...item,
      timestamp: new Date().toISOString()
    });
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get offline queue items
async function getOfflineQueueItems() {
  if (!indexedDB_db) await initIndexedDB();
  
  return new Promise((resolve, reject) => {
    const transaction = indexedDB_db.transaction([STORES.OFFLINE_QUEUE], 'readonly');
    const store = transaction.objectStore(STORES.OFFLINE_QUEUE);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Remove offline queue item
async function removeOfflineQueueItem(itemId) {
  if (!indexedDB_db) await initIndexedDB();
  
  return new Promise((resolve, reject) => {
    const transaction = indexedDB_db.transaction([STORES.OFFLINE_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.OFFLINE_QUEUE);
    const request = store.delete(itemId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear IndexedDB
async function clearIndexedDB() {
  if (!indexedDB_db) await initIndexedDB();
  
  return new Promise((resolve, reject) => {
    const transaction = indexedDB_db.transaction([STORES.MEDICINES, STORES.TRANSACTIONS, STORES.ALERTS, STORES.OFFLINE_QUEUE], 'readwrite');
    
    let completed = 0;
    const total = 4;
    
    const checkComplete = () => {
      completed++;
      if (completed === total) resolve();
    };
    
    transaction.objectStore(STORES.MEDICINES).clear().onsuccess = checkComplete;
    transaction.objectStore(STORES.TRANSACTIONS).clear().onsuccess = checkComplete;
    transaction.objectStore(STORES.ALERTS).clear().onsuccess = checkComplete;
    transaction.objectStore(STORES.OFFLINE_QUEUE).clear().onsuccess = checkComplete;
    
    transaction.onerror = () => reject(transaction.error);
  });
}

// Initialize on load
if (typeof indexedDB !== 'undefined') {
  initIndexedDB().catch(err => {
    console.error('Failed to initialize IndexedDB:', err);
  });
}

