// User management functions (for admin)

// Get all users (admin only - check role before calling)
async function getAllUsers() {
  try {
    const snapshot = await db.collection('users').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || null
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

// Update user role (admin only - check role before calling)
async function updateUserRole(userId, newRole) {
  try {
    if (newRole !== 'admin' && newRole !== 'staff') {
      return { success: false, error: 'Invalid role. Must be "admin" or "staff"' };
    }
    
    await db.collection('users').doc(userId).update({
      role: newRole
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    
    if (error.code === 'permission-denied') {
      return { success: false, error: 'Permission denied. Only admins can update user roles.' };
    }
    
    return { success: false, error: error.message };
  }
}

// Get user by ID
async function getUserById(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) {
      return null;
    }
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || null
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// Check if current user is admin
async function isCurrentUserAdmin() {
  try {
    const role = await getUserRole();
    return role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

