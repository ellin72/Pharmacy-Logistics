// Notification management functions

// Notification preferences stored in Firestore
const NOTIFICATION_TYPES = {
  EXPIRED: 'expired',
  EXPIRING_SOON: 'expiry_soon',
  LOW_STOCK: 'low_stock'
};

// Get user notification preferences
async function getNotificationPreferences() {
  try {
    const user = getCurrentUser();
    if (!user) return null;

    const prefsDoc = await db.collection('notificationPreferences').doc(user.uid).get();
    
    if (prefsDoc.exists) {
      return prefsDoc.data();
    }
    
    // Default preferences
    return {
      emailEnabled: false,
      emailFrequency: 'daily', // 'immediate', 'daily', 'weekly'
      types: {
        expired: true,
        expiry_soon: true,
        low_stock: true
      },
      lastEmailSent: null
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return null;
  }
}

// Save notification preferences
async function saveNotificationPreferences(preferences) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    await db.collection('notificationPreferences').doc(user.uid).set({
      ...preferences,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error saving notification preferences:', error);
    return { success: false, error: error.message };
  }
}

// Show in-app notification
function showInAppNotification(message, type = 'info', duration = 5000) {
  // Remove existing notifications
  const existing = document.getElementById('notificationContainer');
  if (existing) {
    existing.remove();
  }

  // Create notification container
  const container = document.createElement('div');
  container.id = 'notificationContainer';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;

  const typeColors = {
    success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    info: { bg: '#dbeafe', border: '#2563eb', text: '#1e40af' }
  };

  const colors = typeColors[type] || typeColors.info;

  // Build the notification using DOM methods to avoid XSS via innerHTML
  const card = document.createElement('div');
  card.style.cssText = `background:${colors.bg};border-left:4px solid ${colors.border};padding:1rem;border-radius:0.375rem;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);display:flex;align-items:center;gap:1rem;`;

  const msgEl = document.createElement('div');
  msgEl.style.cssText = `flex:1;color:${colors.text};`;
  msgEl.textContent = message;  // safe — textContent never interprets HTML

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `background:transparent;border:none;font-size:1.5rem;cursor:pointer;color:${colors.text};opacity:0.7;`;
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');
  closeBtn.addEventListener('click', () => container.remove());

  card.appendChild(msgEl);
  card.appendChild(closeBtn);
  container.appendChild(card);

  document.body.appendChild(container);

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      if (container.parentElement) {
        container.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => container.remove(), 300);
      }
    }, duration);
  }

  return container;
}

// Check if browser supports notifications
function checkNotificationPermission() {
  if (!('Notification' in window)) {
    return { supported: false, message: 'Browser does not support notifications' };
  }

  if (Notification.permission === 'granted') {
    return { supported: true, granted: true };
  }

  if (Notification.permission === 'denied') {
    return { supported: true, granted: false, message: 'Notifications are blocked' };
  }

  return { supported: true, granted: false, message: 'Permission not requested' };
}

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { success: false, error: 'Browser does not support notifications' };
  }

  if (Notification.permission === 'granted') {
    return { success: true, granted: true };
  }

  try {
    const permission = await Notification.requestPermission();
    return { 
      success: permission === 'granted', 
      granted: permission === 'granted',
      message: permission === 'granted' ? 'Notifications enabled' : 'Notifications blocked'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Show browser notification
function showBrowserNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const notification = new Notification(title, {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    ...options
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  return notification;
}

// Notification center (in-app notifications list)
let notificationCenter = [];

function addToNotificationCenter(notification) {
  notificationCenter.unshift({
    ...notification,
    id: Date.now().toString(),
    timestamp: new Date()
  });

  // Keep only last 50 notifications
  if (notificationCenter.length > 50) {
    notificationCenter = notificationCenter.slice(0, 50);
  }

  // Update UI if notification center is open
  if (window.renderNotificationCenter) {
    window.renderNotificationCenter();
  }
}

function getNotificationCenter() {
  return notificationCenter;
}

function clearNotificationCenter() {
  notificationCenter = [];
  if (window.renderNotificationCenter) {
    window.renderNotificationCenter();
  }
}

// Add CSS animations for notifications
if (!document.getElementById('notificationStyles')) {
  const style = document.createElement('style');
  style.id = 'notificationStyles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

