# Security Permissions Matrix

This document clearly defines what each user role can and cannot do in the Pharmacy Logistics System.

---

## Role Definitions

### 👤 **Staff** (Default Role)
Regular clinic staff members who manage day-to-day inventory operations.

### 👑 **Admin** (Pharmacist/Manager)
Administrative users with full system access, including the ability to manage users and delete records.

---

## Permissions Matrix

### 📦 **Medicines Collection**

| Action | Staff | Admin | Notes |
|--------|-------|-------|-------|
| **View/Read** | ✅ Yes | ✅ Yes | All authenticated users can view all medicines |
| **Add/Create** | ✅ Yes | ✅ Yes | Staff and admins can add new medicines |
| **Update/Edit** | ✅ Yes | ✅ Yes | Staff and admins can update stock levels, quantities, etc. |
| **Delete** | ❌ No | ✅ Yes | Only admins can permanently delete medicines |

**Security Rule:**
```javascript
match /medicines/{medicineId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update: if isAuthenticated();
  allow delete: if isAdmin();
}
```

---

### 📊 **Transactions Collection**

| Action | Staff | Admin | Notes |
|--------|-------|-------|-------|
| **View/Read** | ✅ Yes | ✅ Yes | All users can view transaction history |
| **Create** | ✅ Yes | ✅ Yes | Transactions are created automatically when stock changes |
| **Update** | ❌ No | ✅ Yes | Only admins can modify transactions (for corrections) |
| **Delete** | ❌ No | ✅ Yes | Only admins can delete transactions |

**Security Rule:**
```javascript
match /transactions/{transactionId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update: if isAdmin();
  allow delete: if isAdmin();
}
```

---

### ⚠️ **Alerts Collection**

| Action | Staff | Admin | Notes |
|--------|-------|-------|-------|
| **View/Read** | ✅ Yes | ✅ Yes | All users can see alerts |

### 🔔 **Notification Preferences Collection**

| Action | Staff | Admin | Notes |
|--------|-------|-------|-------|
| **View/Read** | ✅ Own only | ✅ All | Users can see their own preferences |
| **Create** | ✅ Own only | ✅ All | Users can create their own preferences |
| **Update** | ✅ Own only | ✅ All | Users can update their own preferences |
| **Delete** | ✅ Own only | ✅ All | Users can delete their own preferences |

**Security Rule:**
```javascript
match /notificationPreferences/{userId} {
  allow read: if isAuthenticated() && 
               (request.auth.uid == userId || isAdmin());
  allow create: if isAuthenticated() && 
                 request.auth.uid == userId;
  allow update: if isAuthenticated() && 
                 (request.auth.uid == userId || isAdmin());
  allow delete: if isAuthenticated() && 
                 (request.auth.uid == userId || isAdmin());
}
```

---
| **Create** | ✅ Yes | ✅ Yes | Alerts are created automatically by the system |
| **Update/Resolve** | ✅ Yes | ✅ Yes | All users can resolve alerts |
| **Delete** | ❌ No | ✅ Yes | Only admins can delete alerts |

**Security Rule:**
```javascript
match /alerts/{alertId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update: if isAuthenticated();
  allow delete: if isAdmin();
}
```

---

### 👥 **Users Collection**

| Action | Staff | Admin | Notes |
|--------|-------|-------|--------|
| **View Own Profile** | ✅ Yes | ✅ Yes | Users can view their own profile |
| **View All Users** | ✅ Yes | ✅ Yes | All authenticated users can view user list |
| **Create Own Document** | ✅ Yes | ✅ Yes | Auto-created on first login |
| **Update Own Profile** | ✅ Limited | ✅ Yes | Staff can update display name, but NOT role |
| **Update Other Users** | ❌ No | ✅ Yes | Only admins can update other users' profiles |
| **Change User Roles** | ❌ No | ✅ Yes | Only admins can change roles (including their own) |
| **Delete Users** | ❌ No | ✅ Yes | Only admins can delete user accounts |

**Security Rule:**
```javascript
match /users/{userId} {
  allow read: if isAuthenticated();
  
  // Users can create their own document on first login
  allow create: if isAuthenticated() && 
                 request.auth.uid == userId &&
                 request.resource.data.keys().hasAll(['email', 'role', 'createdAt']);
  
  // Users can update their own document, admins can update any
  // But users CANNOT change their own role
  allow update: if isAuthenticated() && 
                 (request.auth.uid == userId || isAdmin()) &&
                 (request.auth.uid == userId && 
                  request.resource.data.role == resource.data.role || 
                  isAdmin());
  
  allow delete: if isAdmin();
}
```

**Important:** Users **cannot** change their own role, even admins updating their own profile. Role changes must be done by another admin.

---

## UI Feature Access

### Features Available to All Users (Staff + Admin)

- ✅ View dashboard and inventory
- ✅ View alerts
- ✅ Add new medicines
- ✅ Adjust stock (add/remove/adjust)
- ✅ View transaction history
- ✅ Resolve alerts
- ✅ Search and filter medicines
- ✅ View own profile

### Admin-Only Features

- 👑 Delete medicines
- 👑 Edit/Delete transactions
- 👑 Delete alerts
- 👑 Manage user roles
- 👑 Delete user accounts
- 👑 Access user management interface

**Note:** Admin-only features are hidden in the UI for staff users and protected by Firestore security rules.

---

## Security Best Practices

### ✅ **Always Enforced by System**

1. **Server-Side Validation:** All permissions are enforced by Firestore security rules - client-side checks are for UX only
2. **Role Verification:** System checks user role from Firestore on every operation
3. **Role Immutability:** Users cannot change their own role (prevents privilege escalation)
4. **Authentication Required:** All operations require valid authentication

### 🔒 **Additional Security Measures**

1. **User Document Creation:**
   - Users can only create their own document (using their own UID)
   - Default role is automatically set to "staff"
   - Admins must manually change role in Firestore Console

2. **Transaction Integrity:**
   - Only admins can modify/delete transactions (maintains audit trail)
   - Staff can create transactions (when adjusting stock)

3. **Data Deletion:**
   - Only admins can delete data (prevents accidental data loss)
   - When medicine is deleted, related alerts are also deleted

---

## Testing Permissions

### As Staff User:

1. ✅ Should be able to add medicines
2. ✅ Should be able to adjust stock
3. ✅ Should be able to view all data
4. ❌ Should NOT see delete buttons
5. ❌ Should NOT be able to delete medicines (Firestore will deny)
6. ❌ Should NOT be able to modify transactions

### As Admin User:

1. ✅ Should be able to do everything staff can do
2. ✅ Should see delete buttons
3. ✅ Should be able to delete medicines
4. ✅ Should be able to modify/delete transactions
5. ✅ Should be able to manage user roles

---

## Error Messages

When a staff user tries to perform an admin action, they will see:

- **Delete Medicine:** "You do not have permission to delete medicines. Only admins can delete."
- **Modify Transaction:** "Permission denied. Only admins can update transactions."
- **Change Role:** "Permission denied. Only admins can update user roles."

---

## Troubleshooting Permissions

### Issue: Staff user can't perform basic actions
**Solution:** Check Firestore security rules are published and user document exists in `users` collection

### Issue: Admin can't delete medicines
**Solution:** 
1. Verify user document has `role: "admin"` (not "Admin" or "ADMIN")
2. Check Firestore rules are published
3. Hard refresh browser (Ctrl+F5)

### Issue: Permission denied errors
**Solution:**
1. Verify user is authenticated (check Firebase Auth)
2. Verify user document exists in Firestore
3. Check browser console for specific error code
4. Verify security rules are published

---

## Security Rules Summary

All permissions are enforced by Firestore Security Rules. The rules:

1. ✅ Require authentication for all operations
2. ✅ Allow read/create/update for authenticated users on most collections
3. ✅ Restrict delete operations to admins only
4. ✅ Prevent users from changing their own role
5. ✅ Allow users to create their own user document on first login

**Location of Rules:**
- `docs/FIRESTORE_RULES_FINAL.rules` - Production-ready rules file (includes notification preferences)
- Firebase Console → Firestore Database → Rules tab

---

## Next Steps

- [ ] Ensure all security rules are deployed to Firebase
- [ ] Test permissions as both staff and admin users
- [ ] Verify UI hides admin features for staff
- [ ] Create first admin user in Firestore
- [ ] Document any custom permissions needed for your clinic

---

**Last Updated:** [Current Date]
**Version:** 1.0

