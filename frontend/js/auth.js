// Authentication functions

// Create or get user document in Firestore
async function createOrGetUserDocument(user) {
  try {
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // First time login - create user document
      // Default role is 'staff' - admin can change this later
      await userRef.set({
        email: user.email,
        role: 'staff', // Default role - change manually for admins
        displayName: user.displayName || user.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('User document created with default role: staff');
    }
    
    return userDoc.exists ? userDoc.data() : {
      email: user.email,
      role: 'staff',
      displayName: user.displayName || user.email.split('@')[0],
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
}

// Get user role
async function getUserRole() {
  try {
    const user = getCurrentUser();
    if (!user) return null;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      return userDoc.data().role;
    }
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

// Check if user is logged in
function checkAuthState() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Create user document if it doesn't exist
      try {
        await createOrGetUserDocument(user);
      } catch (error) {
        console.error('Error creating user document:', error);
        // Don't block login if document creation fails, but log the error
      }
      
      // User is logged in
      if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        window.location.href = 'dashboard.html';
      }
    } else {
      // User is not logged in
      if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
        window.location.href = 'index.html';
      }
    }
  });
}

// Login function
async function login(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    let errorMessage = 'Login failed. Please try again.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
      default:
        errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

// Logout function
async function logout() {
  try {
    await auth.signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Error logging out. Please try again.');
  }
}

// Get current user
function getCurrentUser() {
  return auth.currentUser;
}

// Password reset
async function resetPassword(email) {
  try {
    await auth.sendPasswordResetEmail(email);
    return { success: true, message: 'Password reset email sent. Check your inbox.' };
  } catch (error) {
    let errorMessage = 'Failed to send reset email.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      default:
        errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

// Initialize auth check on page load
// Wait for DOM and Firebase to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof auth !== 'undefined' && typeof firebase !== 'undefined') {
      checkAuthState();
    }
  });
} else {
  // DOM already loaded
  if (typeof auth !== 'undefined' && typeof firebase !== 'undefined') {
    checkAuthState();
  }
}

