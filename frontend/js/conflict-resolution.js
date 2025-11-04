// Offline conflict resolution

// Conflict resolution strategies
const CONFLICT_STRATEGIES = {
  SERVER_WINS: 'server_wins',
  CLIENT_WINS: 'client_wins',
  MERGE: 'merge',
  ASK_USER: 'ask_user'
};

// Default strategy
let conflictStrategy = CONFLICT_STRATEGIES.SERVER_WINS;

// Set conflict resolution strategy
function setConflictStrategy(strategy) {
  if (Object.values(CONFLICT_STRATEGIES).includes(strategy)) {
    conflictStrategy = strategy;
    localStorage.setItem('conflictStrategy', strategy);
  }
}

// Get conflict strategy
function getConflictStrategy() {
  const saved = localStorage.getItem('conflictStrategy');
  return saved || conflictStrategy;
}

// Detect conflicts between local and server data
function detectConflict(localData, serverData, key) {
  if (!localData || !serverData) return false;
  
  // Compare timestamps
  const localTimestamp = localData.updatedAt || localData.timestamp || 0;
  const serverTimestamp = serverData.updatedAt || serverData.timestamp || 0;
  
  // If server is newer, there might be a conflict
  if (serverTimestamp > localTimestamp && localData.synced === false) {
    return true;
  }
  
  // Compare key fields
  if (key === 'quantity') {
    return localData.quantity !== serverData.quantity;
  }
  
  return false;
}

// Resolve conflict automatically
async function resolveConflict(localData, serverData, type = 'medicine') {
  const strategy = getConflictStrategy();
  
  switch (strategy) {
    case CONFLICT_STRATEGIES.SERVER_WINS:
      return {
        resolved: true,
        data: serverData,
        action: 'server_wins',
        message: 'Server version used (newer)'
      };
    
    case CONFLICT_STRATEGIES.CLIENT_WINS:
      return {
        resolved: true,
        data: localData,
        action: 'client_wins',
        message: 'Local version used'
      };
    
    case CONFLICT_STRATEGIES.MERGE:
      return {
        resolved: true,
        data: mergeData(localData, serverData),
        action: 'merge',
        message: 'Data merged'
      };
    
    case CONFLICT_STRATEGIES.ASK_USER:
      return {
        resolved: false,
        requiresUser: true,
        localData: localData,
        serverData: serverData,
        action: 'ask_user'
      };
    
    default:
      return {
        resolved: true,
        data: serverData,
        action: 'server_wins',
        message: 'Default: server wins'
      };
  }
}

// Merge local and server data
function mergeData(localData, serverData) {
  // Merge strategy: take most recent values
  const merged = { ...serverData };
  
  // If local has newer fields, use them
  const localTimestamp = new Date(localData.updatedAt || localData.timestamp || 0);
  const serverTimestamp = new Date(serverData.updatedAt || serverData.timestamp || 0);
  
  if (localTimestamp > serverTimestamp) {
    // Local is newer, merge local changes
    return {
      ...serverData,
      ...localData,
      updatedAt: localTimestamp,
      _merged: true,
      _mergeSource: 'local'
    };
  }
  
  return {
    ...localData,
    ...serverData,
    updatedAt: serverTimestamp,
    _merged: true,
    _mergeSource: 'server'
  };
}

// Show conflict resolution dialog
function showConflictDialog(localData, serverData, onResolve) {
  // Create modal dialog
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 0.5rem;
      padding: 2rem;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    ">
      <h2 style="margin-bottom: 1rem;">⚠️ Conflict Detected</h2>
      <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">
        The data has been modified both locally and on the server. Which version would you like to keep?
      </p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div style="border: 2px solid var(--primary-color); border-radius: 0.375rem; padding: 1rem;">
          <h3 style="margin-bottom: 0.5rem;">Local Version</h3>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">
            ${formatConflictData(localData)}
          </div>
          <button onclick="resolveConflictChoice('local')" class="btn btn-primary" style="margin-top: 1rem; width: 100%;">
            Use Local
          </button>
        </div>
        
        <div style="border: 2px solid var(--success-color); border-radius: 0.375rem; padding: 1rem;">
          <h3 style="margin-bottom: 0.5rem;">Server Version</h3>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">
            ${formatConflictData(serverData)}
          </div>
          <button onclick="resolveConflictChoice('server')" class="btn btn-success" style="margin-top: 1rem; width: 100%;">
            Use Server
          </button>
        </div>
      </div>
      
      <button onclick="resolveConflictChoice('merge')" class="btn btn-secondary" style="width: 100%; margin-bottom: 0.5rem;">
        Merge (Smart Combine)
      </button>
      
      <button onclick="closeConflictDialog()" class="btn btn-secondary" style="width: 100%;">
        Cancel
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // Store resolver function
  window.currentConflictResolver = onResolve;
  window.currentConflictModal = modal;
  window.currentConflictData = { local: localData, server: serverData };
}

// Format conflict data for display
function formatConflictData(data) {
  if (!data) return 'No data';
  
  const lines = [];
  if (data.name) lines.push(`Name: ${data.name}`);
  if (data.batch) lines.push(`Batch: ${data.batch}`);
  if (data.quantity !== undefined) lines.push(`Quantity: ${data.quantity}`);
  if (data.updatedAt) {
    const date = new Date(data.updatedAt);
    lines.push(`Updated: ${date.toLocaleString()}`);
  }
  
  return lines.join('<br>') || 'Unknown data';
}

// Resolve conflict choice
window.resolveConflictChoice = function(choice) {
  if (!window.currentConflictResolver || !window.currentConflictModal) return;
  
  let resolvedData;
  
  switch (choice) {
    case 'local':
      resolvedData = window.currentConflictData.local;
      break;
    case 'server':
      resolvedData = window.currentConflictData.server;
      break;
    case 'merge':
      resolvedData = mergeData(window.currentConflictData.local, window.currentConflictData.server);
      break;
    default:
      resolvedData = window.currentConflictData.server;
  }
  
  window.currentConflictResolver({
    resolved: true,
    data: resolvedData,
    action: choice
  });
  
  closeConflictDialog();
};

// Close conflict dialog
window.closeConflictDialog = function() {
  if (window.currentConflictModal) {
    window.currentConflictModal.remove();
    window.currentConflictModal = null;
    window.currentConflictResolver = null;
    window.currentConflictData = null;
  }
};

// Sync with conflict resolution
async function syncWithConflictResolution(localItems, serverItems, compareFn, updateFn) {
  const conflicts = [];
  const synced = [];
  
  for (const localItem of localItems) {
    const serverItem = serverItems.find(item => compareFn(localItem, item));
    
    if (serverItem) {
      // Check for conflict
      if (detectConflict(localItem, serverItem)) {
        const resolution = await resolveConflict(localItem, serverItem);
        
        if (resolution.resolved) {
          await updateFn(resolution.data);
          synced.push(resolution.data);
        } else {
          conflicts.push({ local: localItem, server: serverItem });
        }
      } else {
        // No conflict, use server version
        await updateFn(serverItem);
        synced.push(serverItem);
      }
    } else {
      // New item, sync to server
      await updateFn(localItem);
      synced.push(localItem);
    }
  }
  
  // Handle conflicts that require user input
  if (conflicts.length > 0 && getConflictStrategy() === CONFLICT_STRATEGIES.ASK_USER) {
    for (const conflict of conflicts) {
      await new Promise((resolve) => {
        showConflictDialog(conflict.local, conflict.server, (resolution) => {
          updateFn(resolution.data).then(() => {
            synced.push(resolution.data);
            resolve();
          });
        });
      });
    }
  }
  
  return { synced, conflicts: conflicts.length };
}

// Initialize conflict resolution
function initConflictResolution() {
  // Load saved strategy
  const saved = localStorage.getItem('conflictStrategy');
  if (saved) {
    conflictStrategy = saved;
  }
}

// Initialize on load
if (typeof window !== 'undefined') {
  initConflictResolution();
}

