# Quick Setup: Role-Based Security Rules

This is a condensed version for quick reference. For detailed explanations, see `ROLE_BASED_SECURITY_SETUP.md`.

## 🚀 Quick Steps

### 1. Copy Firestore Rules

1. Go to Firebase Console → Firestore Database → **Rules** tab
2. Copy the rules from `docs/FIRESTORE_RULES_COMPLETE.rules`
3. Paste and click **"Publish"**

### 2. Code Already Updated ✅

The following files have been automatically updated:
- ✅ `frontend/js/auth.js` - Now creates user documents on login
- ✅ `frontend/js/config.js` - Cleaned up duplicate initialization
- ✅ `frontend/js/inventory.js` - Better error handling for permissions
- ✅ `frontend/js/users.js` - User management functions (new)

### 3. Create Your First Admin User

**Method: Firebase Console**

1. Go to **Authentication** → **Users** → Copy your user's **UID**
2. Go to **Firestore Database** → **Data** tab
3. Click **"Start collection"**
   - Collection ID: `users`
   - Document ID: Paste the UID
4. Add fields:
   ```
   email: "your-email@example.com" (string)
   role: "admin" (string)
   displayName: "Your Name" (string, optional)
   createdAt: [Click "Set timestamp"]
   ```
5. Click **"Save"**

### 4. Test It!

1. Log in with your admin account
2. Try deleting a medicine (should work ✅)
3. Create a staff account
4. Log in as staff and try deleting (should fail ❌)

## ✅ Done!

Your role-based security is now active. All new users will automatically get `"staff"` role on first login. Admins can manage roles through Firestore or by creating a user management UI.

## 📝 What Changed?

**Security:**
- Staff can: Read, Create, Update medicines
- Admins can: Read, Create, Update, **Delete** medicines
- Users can't change their own role (admins must do it)

**User Management:**
- User documents created automatically on first login
- Default role is "staff"
- Role stored in Firestore `users` collection

---

**Need help?** See `docs/ROLE_BASED_SECURITY_SETUP.md` for detailed explanations.

