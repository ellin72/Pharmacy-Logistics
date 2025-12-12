// Alert management functions

// Trigger notification when alert is created
async function triggerAlertNotification(alert) {
  try {
    // Add to notification center
    if (typeof addToNotificationCenter === 'function') {
      addToNotificationCenter({
        title: `Alert: ${alert.medicineName}`,
        message: alert.type === 'expired' ? 'Medicine has expired' :
                alert.type === 'expiry_soon' ? `Expires on ${alert.dueOn ? new Date(alert.dueOn).toLocaleDateString() : 'soon'}` :
                'Stock is below minimum threshold',
        type: alert.type === 'expired' ? 'error' : 
              alert.type === 'expiry_soon' ? 'warning' : 'warning'
      });
    }

    // Show in-app notification
    if (typeof showInAppNotification === 'function') {
      const message = alert.type === 'expired' ? 
        `🚨 ${alert.medicineName} has expired!` :
        alert.type === 'expiry_soon' ? 
        `⚠️ ${alert.medicineName} expiring soon` :
        `📉 ${alert.medicineName} is low on stock`;
      
      showInAppNotification(message, alert.type === 'expired' ? 'error' : 'warning', 8000);
    }

    // Show browser notification if permission granted
    if (typeof showBrowserNotification === 'function' && typeof checkNotificationPermission === 'function') {
      const permission = checkNotificationPermission();
      if (permission.granted) {
        showBrowserNotification(
          `Alert: ${alert.medicineName}`,
          {
            body: alert.type === 'expired' ? 'This medicine has expired' :
                  alert.type === 'expiry_soon' ? 'Expiring soon - action needed' :
                  'Low stock - reorder needed',
            tag: `alert-${alert.id}`,
            requireInteraction: alert.type === 'expired'
          }
        );
      }
    }
  } catch (error) {
    console.error('Error triggering alert notification:', error);
  }
}

// Get all active alerts
async function getAllAlerts() {
  try {
    const snapshot = await db.collection('alerts')
      .where('resolved', '==', false)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueOn: doc.data().dueOn?.toDate() || null,
      createdAt: doc.data().createdAt?.toDate() || null
    }));
  } catch (error) {
    console.error('Error fetching alerts:', error);
    // If query fails (might need index), try without orderBy
    try {
      const snapshot = await db.collection('alerts')
        .where('resolved', '==', false)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueOn: doc.data().dueOn?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || null
      })).sort((a, b) => {
        // Sort by severity and date
        const severityOrder = { high: 3, medium: 2, low: 1 };
        const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    } catch (retryError) {
      console.error('Error in retry fetch:', retryError);
      return [];
    }
  }
}

// Resolve an alert
async function resolveAlert(alertId) {
  try {
    const user = getCurrentUser();
    await db.collection('alerts').doc(alertId).update({
      resolved: true,
      resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      resolvedBy: user.uid
    });
    return { success: true };
  } catch (error) {
    console.error('Error resolving alert:', error);
    return { success: false, error: error.message };
  }
}

// Resolve all active alerts
// Optionally accepts an alerts array to avoid race conditions
// If not provided, fetches all unresolved alerts from Firestore
async function resolveAllAlerts(alertsArray = null) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Use provided alerts array or fetch from Firestore
    let alerts;
    if (alertsArray && Array.isArray(alertsArray) && alertsArray.length > 0) {
      // Use provided alerts (from real-time subscription) to avoid race conditions
      alerts = alertsArray;
    } else {
      // Fallback: fetch all unresolved alerts
      alerts = await getAllAlerts();
    }
    
    if (alerts.length === 0) {
      return { success: true, message: 'No alerts to resolve', resolved: 0 };
    }

    // Resolve all alerts in batch using Firestore batch write
    const batch = db.batch();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    
    alerts.forEach(alert => {
      const alertRef = db.collection('alerts').doc(alert.id);
      batch.update(alertRef, {
        resolved: true,
        resolvedAt: timestamp,
        resolvedBy: user.uid
      });
    });

    await batch.commit();
    
    return { 
      success: true, 
      message: `Successfully resolved ${alerts.length} alert${alerts.length !== 1 ? 's' : ''}`,
      resolved: alerts.length
    };
  } catch (error) {
    console.error('Error resolving all alerts:', error);
    return { success: false, error: error.message };
  }
}

// Make resolveAllAlerts globally accessible
if (typeof window !== 'undefined') {
  window.resolveAllAlerts = resolveAllAlerts;
}

// Get alerts by type
async function getAlertsByType(type) {
  try {
    const snapshot = await db.collection('alerts')
      .where('resolved', '==', false)
      .where('type', '==', type)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueOn: doc.data().dueOn?.toDate() || null,
      createdAt: doc.data().createdAt?.toDate() || null
    }));
  } catch (error) {
    console.error('Error fetching alerts by type:', error);
    return [];
  }
}

// Get alert count by type
async function getAlertCounts() {
  try {
    const allAlerts = await getAllAlerts();
    return {
      total: allAlerts.length,
      expired: allAlerts.filter(a => a.type === 'expired').length,
      expiringSoon: allAlerts.filter(a => a.type === 'expiry_soon').length,
      lowStock: allAlerts.filter(a => a.type === 'low_stock').length
    };
  } catch (error) {
    console.error('Error getting alert counts:', error);
    return { total: 0, expired: 0, expiringSoon: 0, lowStock: 0 };
  }
}

// Real-time listener for alerts
function subscribeToAlerts(callback) {
  return db.collection('alerts')
    .where('resolved', '==', false)
    .onSnapshot((snapshot) => {
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueOn: doc.data().dueOn?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || null
      }));
      
      // Sort by severity and date
      alerts.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      
      callback(alerts);
    }, (error) => {
      console.error('Error in alerts subscription:', error);
      // Try without orderBy if it fails
      callback([]);
    });
}

