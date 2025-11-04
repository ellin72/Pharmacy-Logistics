// Transaction management functions

// Get all transactions
async function getAllTransactions(filters = {}) {
  try {
    let query = db.collection('transactions').orderBy('timestamp', 'desc');
    
    // Apply filters
    if (filters.medicineId) {
      query = query.where('medicineId', '==', filters.medicineId);
    }
    if (filters.type) {
      query = query.where('type', '==', filters.type);
    }
    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    
    // Limit results if specified
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || null
    }));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

// Get transactions for a specific medicine
async function getTransactionsByMedicine(medicineId, limit = 50) {
  try {
    const snapshot = await db.collection('transactions')
      .where('medicineId', '==', medicineId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || null
    }));
  } catch (error) {
    console.error('Error fetching medicine transactions:', error);
    return [];
  }
}

// Get transaction statistics
async function getTransactionStats(startDate, endDate) {
  try {
    const allTransactions = await getAllTransactions();
    
    const filtered = allTransactions.filter(t => {
      if (!t.timestamp) return false;
      const date = t.timestamp;
      return (!startDate || date >= startDate) && (!endDate || date <= endDate);
    });
    
    const stats = {
      total: filtered.length,
      adds: filtered.filter(t => t.type === 'add').length,
      removes: filtered.filter(t => t.type === 'remove').length,
      adjusts: filtered.filter(t => t.type === 'adjust').length,
      totalAdded: filtered.filter(t => t.type === 'add').reduce((sum, t) => sum + (t.quantity || 0), 0),
      totalRemoved: filtered.filter(t => t.type === 'remove').reduce((sum, t) => sum + Math.abs(t.quantity || 0), 0)
    };
    
    return stats;
  } catch (error) {
    console.error('Error calculating transaction stats:', error);
    return { total: 0, adds: 0, removes: 0, adjusts: 0, totalAdded: 0, totalRemoved: 0 };
  }
}

// Real-time listener for transactions
function subscribeToTransactions(callback, filters = {}) {
  let query = db.collection('transactions').orderBy('timestamp', 'desc');
  
  if (filters.medicineId) {
    query = query.where('medicineId', '==', filters.medicineId);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  
  return query.onSnapshot((snapshot) => {
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || null
    }));
    callback(transactions);
  }, (error) => {
    console.error('Error in transactions subscription:', error);
    callback([]);
  });
}

