// Offline support and queue management

let offlineQueue = [];
let isOnline = navigator.onLine;
let syncInProgress = false;

// Initialize offline support
function initOfflineSupport() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }

  // Monitor online/offline status
  window.addEventListener('online', () => {
    isOnline = true;
    showInAppNotification('Connection restored. Syncing data...', 'success');
    syncOfflineQueue();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    showInAppNotification('You are offline. Changes will be saved when connection is restored.', 'warning', 10000);
  });

  // Load offline queue from localStorage
  loadOfflineQueue();
}

// Add operation to offline queue
function addToOfflineQueue(operation) {
  offlineQueue.push({
    ...operation,
    id: Date.now().toString(),
    timestamp: new Date().toISOString()
  });
  
  saveOfflineQueue();
  
  if (typeof showInAppNotification === 'function') {
    showInAppNotification('Operation queued. Will sync when online.', 'info', 3000);
  }
}

// Load offline queue from IndexedDB or localStorage
async function loadOfflineQueue() {
  try {
    // Try IndexedDB first
    if (typeof indexedDB !== 'undefined' && typeof getOfflineQueueItems === 'function') {
      try {
        offlineQueue = await getOfflineQueueItems();
        return;
      } catch (error) {
        console.warn('IndexedDB not available, using localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    const saved = localStorage.getItem('offlineQueue');
    if (saved) {
      offlineQueue = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading offline queue:', error);
    offlineQueue = [];
  }
}

// Save offline queue to IndexedDB or localStorage
async function saveOfflineQueue() {
  try {
    // Try IndexedDB first
    if (typeof indexedDB !== 'undefined' && typeof saveOfflineQueueItem === 'function') {
      try {
        // Save each item to IndexedDB
        for (const item of offlineQueue) {
          if (!item.id || item.id.toString().startsWith('temp')) {
            await saveOfflineQueueItem(item);
          }
        }
        return;
      } catch (error) {
        console.warn('IndexedDB save failed, using localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
  } catch (error) {
    console.error('Error saving offline queue:', error);
  }
}

// Sync offline queue when back online
async function syncOfflineQueue() {
  if (syncInProgress || offlineQueue.length === 0 || !isOnline) {
    return;
  }

  syncInProgress = true;
  const queue = [...offlineQueue];
  const failed = [];

  for (const operation of queue) {
    try {
      let result;
      
      switch (operation.type) {
        case 'addMedicine':
          result = await addMedicine(operation.data);
          break;
        case 'updateStock':
          result = await updateStock(operation.data.medicineId, operation.data.transactionType, operation.data.quantity, operation.data.reason);
          break;
        case 'deleteMedicine':
          result = await deleteMedicine(operation.data.medicineId);
          break;
        default:
          console.warn('Unknown operation type:', operation.type);
          continue;
      }

      if (!result.success) {
        failed.push(operation);
      }
    } catch (error) {
      console.error('Error syncing operation:', error);
      failed.push(operation);
    }
  }

  // Update queue with failed operations
  offlineQueue = failed;
  saveOfflineQueue();

  syncInProgress = false;

  if (queue.length > failed.length) {
    const synced = queue.length - failed.length;
    if (typeof showInAppNotification === 'function') {
      showInAppNotification(`Synced ${synced} operation(s). ${failed.length > 0 ? failed.length + ' failed.' : ''}`, 'success');
    }
  }

  if (failed.length > 0 && typeof showInAppNotification === 'function') {
    showInAppNotification(`${failed.length} operation(s) failed to sync. Please try again.`, 'error');
  }
}

// Wrapper for operations with offline support
async function executeWithOfflineSupport(operationType, operationFunction, ...args) {
  if (isOnline) {
    try {
      return await operationFunction(...args);
    } catch (error) {
      // If network error, queue for offline
      if (error.code === 'unavailable' || error.message.includes('network') || !navigator.onLine) {
        addToOfflineQueue({
          type: operationType,
          data: args[0] || {},
          function: operationFunction.toString()
        });
        return { success: false, error: 'Offline. Operation queued for sync.', queued: true };
      }
      throw error;
    }
  } else {
    // Offline - queue operation
    addToOfflineQueue({
      type: operationType,
      data: args[0] || {},
      function: operationFunction.toString()
    });
    return { success: false, error: 'Offline. Operation queued for sync.', queued: true };
  }
}

// Get offline queue status
function getOfflineQueueStatus() {
  return {
    count: offlineQueue.length,
    isOnline: isOnline,
    syncInProgress: syncInProgress
  };
}

// Clear offline queue
function clearOfflineQueue() {
  offlineQueue = [];
  saveOfflineQueue();
}

// Check online status
function checkOnlineStatus() {
  return navigator.onLine;
}

// Initialize on page load
if (typeof window !== 'undefined') {
  initOfflineSupport();
}

