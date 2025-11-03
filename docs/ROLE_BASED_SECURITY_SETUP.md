# Step-by-Step Guide: Implementing Role-Based Security Rules

This guide will walk you through implementing production-ready role-based security rules for your Pharmacy Logistics System.

## Overview

The role-based rules will:
- Allow all authenticated users to read and create medicines/transactions/alerts
- Only allow admins to delete medicines
- Only allow admins to modify/delete transactions
- Allow users to resolve alerts, but only admins can delete them
- Manage user roles in a `users` collection

---

## Step 1: Create Users Collection Structure

### 1.1 Understanding the Users Collection

Each user document will be stored in Firestore at: `users/{userId}` where `{userId}` is the Firebase Auth UID.

**Document Structure:**
```json
{
  "email": "pharmacist@ehafoclinic.com",
  "role": "admin",
  "displayName": "Dr. John Doe",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Roles:**
- `"admin"`: Full access (can delete medicines, manage users, etc.)
- `"staff"`: Standard access (can add/edit medicines, adjust stock, but cannot delete)

---

## Step 2: Update Authentication Flow to Create User Records

We need to automatically create a user document in Firestore when a user first logs in (if one doesn't exist).

### 2.1 Update `frontend/js/auth.js`

Add a function to create or get user document:

```javascript
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
```

Update the `checkAuthState` function to create user document on login:

```javascript
function checkAuthState() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Create user document if it doesn't exist
      try {
        await createOrGetUserDocument(user);
      } catch (error) {
        console.error('Error creating user document:', error);
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
```

---

## Step 3: Fix Firebase Config (Remove Duplicate Initialization)

Your `config.js` has both v8 and v9 syntax. Since you're using v8 (firebase.initializeApp), let's clean it up.

Update `frontend/js/config.js` to remove the duplicate:

```javascript
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxQdx6F6sVLFikwX_3WcNub18xfP4wRQg",
  authDomain: "ehafo-pharmacy-logistics-3ca06.firebaseapp.com",
  projectId: "ehafo-pharmacy-logistics-3ca06",
  storageBucket: "ehafo-pharmacy-logistics-3ca06.firebasestorage.app",
  messagingSenderId: "546090396793",
  appId: "1:546090396793:web:4df5ef2f2a555e63c8f8a8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
```

---

## Step 4: Set Up Firestore Security Rules

### 4.1 Navigate to Firestore Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `ehafo-pharmacy-logistics-3ca06`
3. Click on **"Firestore Database"** in the left menu
4. Click on the **"Rules"** tab

### 4.2 Copy and Paste Role-Based Rules

**⚠️ IMPORTANT:** Use the complete rules file at `docs/FIRESTORE_RULES_FINAL.rules` for production.

Replace the existing rules with the following (or copy from `docs/FIRESTORE_RULES_FINAL.rules`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Check if user is admin by reading their user document
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper: check if user document exists
    function userExists() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }
    
    // Medicines collection
    match /medicines/{medicineId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      
      // All authenticated users can create
      allow create: if isAuthenticated();
      
      // All authenticated users can update
      allow update: if isAuthenticated();
      
      // Only admins can delete
      allow delete: if isAdmin();
    }
    
    // Transactions collection
    match /transactions/{transactionId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      
      // All authenticated users can create
      allow create: if isAuthenticated();
      
      // Only admins can update or delete
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Alerts collection
    match /alerts/{alertId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      
      // System can create alerts (authenticated users)
      allow create: if isAuthenticated();
      
      // All authenticated users can update (to resolve alerts)
      allow update: if isAuthenticated();
      
      // Only admins can delete
      allow delete: if isAdmin();
    }
    
    // Users collection
    match /users/{userId} {
      // Users can read their own document or any user if authenticated
      allow read: if isAuthenticated();
      
      // Users can create their own document on first login
      allow create: if isAuthenticated() && 
                     request.auth.uid == userId &&
                     request.resource.data.keys().hasAll(['email', 'role', 'createdAt']) &&
                     request.resource.data.role is string &&
                     request.resource.data.email is string;
      
      // Users can update their own document, admins can update any
      allow update: if isAuthenticated() && 
                     (request.auth.uid == userId || isAdmin()) &&
                     // Prevent users from changing their own role
                     (request.auth.uid == userId && 
                      request.resource.data.role == resource.data.role || 
                      isAdmin());
      
      // Only admins can delete user documents
      allow delete: if isAdmin();
    }
  }
}
```

### 4.3 Publish Rules

1. Click **"Publish"** button at the top
2. Wait for confirmation that rules are published

---

## Step 5: Create Initial Admin User

After setting up the rules, you need to manually set the first admin user.

### 5.1 Method 1: Using Firebase Console (Recommended for First Admin)

1. Go to Firebase Console → **Firestore Database** → **Data** tab
2. Click **"Start collection"**
3. Collection ID: `users`
4. Document ID: Enter the Firebase Auth UID of your admin user
   - To find UID: Go to **Authentication** → **Users** → Click on user → Copy UID
5. Add fields:
   - `email` (string): Admin email address
   - `role` (string): `admin`
   - `displayName` (string): Admin name (optional)
   - `createdAt` (timestamp): Current timestamp (click "Set timestamp")

6. Click **"Save"**

### 5.2 Method 2: Using the App (After Rules Are Set)

Create an admin management page or temporarily allow users to set their role, then remove that functionality. However, **Method 1 is recommended** for security.

---

## Step 6: Test the Security Rules

### 6.1 Test as Staff User

1. Log in with a **staff** account
2. Try to:
   - ✅ Add a medicine (should work)
   - ✅ Update medicine stock (should work)
   - ✅ Delete a medicine (should **fail** with permission error)

### 6.2 Test as Admin User

1. Log in with an **admin** account
2. Try to:
   - ✅ Add a medicine (should work)
   - ✅ Update medicine stock (should work)
   - ✅ Delete a medicine (should **work**)

### 6.3 Monitor in Firebase Console

1. Go to **Firestore Database** → **Usage** tab
2. Check for any permission denied errors

---

## Step 7: Add Role Display in UI (Optional)

Update `dashboard.html` to show user role:

```javascript
// In initDashboard function
async function initDashboard() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  // Get and display user role
  const userRole = await getUserRole();
  const roleBadge = userRole === 'admin' ? '👑 Admin' : '👤 Staff';
  document.getElementById('userEmail').textContent = `${user.email} (${roleBadge})`;
  
  // ... rest of the function
}
```

---

## Step 8: Handle Permission Errors Gracefully

Update your error handling to show user-friendly messages:

```javascript
// In inventory.js, add error handling
async function deleteMedicine(medicineId) {
  try {
    const result = await db.collection('medicines').doc(medicineId).delete();
    return { success: true };
  } catch (error) {
    if (error.code === 'permission-denied') {
      return { success: false, error: 'You do not have permission to delete medicines. Only admins can delete.' };
    }
    return { success: false, error: error.message };
  }
}
```

---

## Step 9: Create User Management Functions (Optional)

For admins to manage user roles, create `frontend/js/users.js`:

```javascript
// Get all users (admin only)
async function getAllUsers() {
  try {
    const snapshot = await db.collection('users').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

// Update user role (admin only)
async function updateUserRole(userId, newRole) {
  try {
    if (newRole !== 'admin' && newRole !== 'staff') {
      return { success: false, error: 'Invalid role' };
    }
    
    await db.collection('users').doc(userId).update({
      role: newRole
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: error.message };
  }
}
```

---

## Troubleshooting

### Issue: "Permission denied" when logging in
**Solution:** Make sure the user document exists in Firestore. Check that `createOrGetUserDocument` is being called.

### Issue: Can't create user document
**Solution:** Check that security rules allow authenticated users to create their own document. Verify the rules were published.

### Issue: Admin can't delete medicines
**Solution:** 
1. Check that the user document has `role: "admin"` (not "Admin" or "ADMIN")
2. Verify security rules are published
3. Check browser console for specific error messages

### Issue: Rules say "allow" but still getting errors
**Solution:**
- Wait 1-2 minutes after publishing rules (propagation delay)
- Hard refresh browser (Ctrl+F5)
- Clear browser cache
- Check Firebase Console → Firestore → Rules for syntax errors

---

## Security Best Practices

1. **Never store sensitive data in client-side code**
2. **Always validate on server side** (use Cloud Functions for critical operations)
3. **Use least privilege principle** - give users only necessary permissions
4. **Regularly audit user roles** - remove admin access when not needed
5. **Monitor Firestore usage** for suspicious activity
6. **Use strong passwords** - enforce password policies in Firebase Auth settings

---

## Next Steps

1. ✅ Set up security rules (completed above)
2. ✅ Create initial admin user
3. ⏳ Test all operations as both admin and staff
4. ⏳ Create user management UI (optional)
5. ⏳ Add role checks in frontend before showing delete buttons
6. ⏳ Set up Cloud Functions for server-side validation (advanced)

---

## Summary Checklist

- [ ] Updated `auth.js` to create user documents
- [ ] Set up Firestore security rules
- [ ] Created first admin user in Firestore
- [ ] Tested staff permissions (can't delete)
- [ ] Tested admin permissions (can delete)
- [ ] Added role display in UI (optional)
- [ ] Tested user document creation on first login

Your role-based security is now implemented! 🎉

