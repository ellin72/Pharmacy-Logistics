# Troubleshooting Guide

## Common Issues and Solutions

### Redirect Loop Between Login and Dashboard

**Symptoms:** Page keeps redirecting between `index.html` and `dashboard.html`

**Cause:** Firebase Auth state isn't ready when the page checks for authentication.

**Solution:** ✅ **FIXED** - Updated all pages to wait for auth state before checking user. This should be resolved in the latest version.

If you still experience this:
1. Hard refresh (Ctrl+F5)
2. Clear browser cache
3. Check browser console for errors

---

### 404 Errors in Server Logs

**Symptoms:** 
```
::1 - - [03/Nov/2025 20:38:37] code 404, message File not found
::1 - - [03/Nov/2025 20:38:37] "GET /favicon.ico HTTP/1.1" 404 -
```

**Cause:** Browser is looking for optional files (favicon, Chrome DevTools config).

**Solution:** ✅ **HARMLESS** - These 404s are normal and don't affect functionality. The browser requests these files automatically. You can ignore them.

If you want to remove the favicon 404, add this to your HTML `<head>`:
```html
<link rel="icon" href="data:,">
```

---

### Firebase SDK Errors

**Symptoms:** 
- `Uncaught ReferenceError: firebase is not defined`
- `Cannot use import statement outside a module`

**Cause:** Wrong Firebase SDK version or scripts not loading in correct order.

**Solution:** ✅ **FIXED** - All HTML files now use Firebase SDK v8.10.1 (compatible with our code).

If errors persist:
1. Hard refresh browser (Ctrl+F5)
2. Check that Firebase SDK scripts load before `config.js`
3. Check browser console for network errors loading Firebase scripts

---

### Permission Denied Errors

**Symptoms:** 
- `permission-denied` errors when trying to delete medicines
- Can't create user documents

**Cause:** 
- Firestore security rules not set up
- User doesn't have admin role when trying to delete

**Solution:**
1. Set up Firestore security rules (see `docs/ROLE_BASED_SECURITY_SETUP.md`)
2. For deletion errors: Check user role in Firestore `users` collection
3. For user document creation: Make sure security rules allow authenticated users to create their own document

---

### Can't Log In

**Symptoms:** Login form shows error or doesn't redirect

**Cause:**
- Email/password authentication not enabled in Firebase
- Wrong credentials
- User account doesn't exist

**Solution:**
1. Firebase Console → Authentication → Sign-in method → Enable Email/Password
2. Verify user exists in Firebase Console → Authentication → Users
3. Try password reset if needed

---

### Real-time Updates Not Working

**Symptoms:** Changes don't appear immediately, need to refresh

**Cause:** Firestore listeners not set up correctly or connection issues

**Solution:**
1. Check browser console for Firestore errors
2. Verify internet connection
3. Check Firestore security rules allow read access

---

### Alerts Not Showing

**Symptoms:** No alerts appear even when medicines are expired/low stock

**Cause:** 
- Alerts are created automatically when conditions are met
- Medicine might not meet alert criteria yet

**Solution:**
1. Alerts are created when:
   - Medicine expires (expiry date passed)
   - Medicine expiring soon (within 3 months)
   - Stock below minimum threshold
2. Try adding a medicine with expiry date within 3 months to test
3. Try setting stock below threshold to test low stock alert

---

## Browser Console Errors to Ignore

These are normal and can be ignored:

- **MetaMask extension errors** - From browser extension, not your app
- **Slow network warnings** - Browser warning, not an error
- **404 for favicon.ico** - Browser requests this automatically
- **404 for .well-known paths** - Chrome DevTools requests

---

## Getting Help

If you encounter an issue not listed here:

1. **Check browser console** (F12 → Console tab) for error messages
2. **Check Firebase Console** for Firestore errors
3. **Verify configuration:**
   - Firebase config in `frontend/js/config.js` is correct
   - Firestore security rules are published
   - Authentication is enabled

4. **Review documentation:**
   - `docs/ROLE_BASED_SECURITY_SETUP.md` - Security setup
   - `docs/DEPLOYMENT.md` - Deployment issues
   - `SETUP.md` - Initial setup

---

## Debugging Tips

1. **Enable Firestore logging:**
   ```javascript
   firebase.firestore.setLogLevel('debug');
   ```

2. **Check auth state:**
   ```javascript
   auth.onAuthStateChanged(user => {
     console.log('Auth state:', user ? user.email : 'Not logged in');
   });
   ```

3. **Test Firestore connection:**
   ```javascript
   db.collection('medicines').limit(1).get()
     .then(snap => console.log('Firestore connected:', snap.empty ? 'Empty' : 'Has data'))
     .catch(err => console.error('Firestore error:', err));
   ```

---

## Quick Checklist

When something isn't working:

- [ ] Firebase config is correct
- [ ] Firestore database is created
- [ ] Authentication is enabled (Email/Password)
- [ ] Firestore security rules are published
- [ ] User exists in Firebase Authentication
- [ ] User document exists in Firestore `users` collection (for role-based access)
- [ ] Browser console shows no errors
- [ ] Hard refresh browser (Ctrl+F5)

