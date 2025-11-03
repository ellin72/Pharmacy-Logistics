# Security Rules - Quick Reference

## 🎯 Role-Based Permissions Summary

### Staff (Default Role)
- ✅ View all data
- ✅ Add medicines
- ✅ Update stock levels
- ✅ Resolve alerts
- ❌ Cannot delete medicines
- ❌ Cannot modify transactions
- ❌ Cannot manage users

### Admin
- ✅ Everything staff can do
- ✅ Delete medicines
- ✅ Modify/delete transactions
- ✅ Manage user roles
- ✅ Delete users

---

## 📋 Firestore Security Rules

### Location
- **Production Rules:** `docs/FIRESTORE_RULES_FINAL.rules`
- **Firebase Console:** Firestore Database → Rules tab

### Key Rules

```javascript
// Medicines
- Read, Create, Update: All authenticated users
- Delete: Admins only

// Transactions  
- Read, Create: All authenticated users
- Update, Delete: Admins only

// Alerts
- Read, Create, Update: All authenticated users
- Delete: Admins only

// Users
- Read: All authenticated users
- Create own document: Users (with default "staff" role)
- Update own profile: Users (but NOT role)
- Update any user: Admins only
- Delete: Admins only
```

---

## 🔒 Security Guarantees

1. **Users cannot create themselves as admin** - Default role is always "staff"
2. **Users cannot change their own role** - Prevents privilege escalation
3. **All deletions require admin** - Prevents accidental data loss
4. **Transaction integrity** - Only admins can modify historical records

---

## 🧪 Testing Checklist

- [ ] Staff can add medicines
- [ ] Staff can adjust stock
- [ ] Staff CANNOT see delete buttons
- [ ] Staff CANNOT delete medicines (Firestore denies)
- [ ] Admin can see delete buttons
- [ ] Admin can delete medicines
- [ ] Admin can manage users
- [ ] User role displayed correctly in UI

---

**For full details, see:** `docs/SECURITY_PERMISSIONS.md`

