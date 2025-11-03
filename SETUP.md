# Quick Setup Guide

Follow these steps to get your Pharmacy Logistics System up and running quickly.

## Prerequisites

- A Google account (for Firebase)
- A modern web browser
- (Optional) Node.js installed for local development server

---

## Step-by-Step Setup

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Enter project name: `ehafo-pharmacy-logistics` (or any name you prefer)
4. **Disable** Google Analytics (optional, for MVP you don't need it)
5. Click **"Create project"**

### 2. Enable Authentication

1. In Firebase Console, click **"Authentication"** in the left menu
2. Click **"Get started"**
3. Click on **"Sign-in method"** tab
4. Click on **"Email/Password"**
5. **Enable** it and click **"Save"**

### 3. Create Firestore Database

1. In Firebase Console, click **"Firestore Database"** in the left menu
2. Click **"Create database"**
3. Select **"Start in production mode"** (we'll add security rules)
4. Choose a location closest to you
5. Click **"Enable"**

### 4. Get Firebase Configuration

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **web icon** `</>` 
5. Register app with nickname: `Ehafo Pharmacy Web`
6. **Copy the `firebaseConfig` object** that appears

### 5. Configure Your App

1. Open `frontend/js/config.js` in your code editor
2. Replace the placeholder values with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 6. Set Firestore Security Rules

1. In Firebase Console, go to **Firestore Database** → **Rules** tab
2. Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write all data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **"Publish"**

> **Note**: These are basic rules for MVP. For production, implement role-based rules as shown in `database/schema.md`.

### 7. Create Your First Admin User

1. In Firebase Console, go to **Authentication** → **Users** tab
2. Click **"Add user"**
3. Enter your email and a temporary password
4. Click **"Add user"**
5. You'll use this account to log into the system

### 8. Test Locally

**Option A: Using Python** (if installed)
```bash
cd frontend
python -m http.server 8000
```
Then open http://localhost:8000

**Option B: Using Node.js** (if installed)
```bash
npx http-server frontend -p 8000
```
Then open http://localhost:8000

**Option C: Using VS Code**
- Install "Live Server" extension
- Right-click on `index.html` → "Open with Live Server"

### 9. Login and Test

1. Open the app in your browser
2. Log in with the email/password you created
3. Click **"Add Medicine"** and add a test medicine
4. Verify it appears in the dashboard
5. Try adjusting stock

---

## Deploy to Production

See `docs/DEPLOYMENT.md` for detailed deployment instructions.

**Quick deploy to Firebase Hosting:**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy --only hosting
```

---

## Troubleshooting

### "Firebase not configured" error
- Make sure you've updated `frontend/js/config.js` with your Firebase config
- Check that all values are correct (no extra spaces, quotes are correct)

### "Permission denied" error in Firestore
- Check that you've published the security rules
- Make sure you're logged in
- Verify the rules allow authenticated users

### Can't log in
- Make sure Email/Password authentication is enabled in Firebase Console
- Check that you created a user in Authentication → Users
- Try resetting password if needed

### Alerts not showing
- This is normal - alerts are created automatically when:
  - Medicine is expiring soon (within 30 days)
  - Stock is low (below threshold)
  - Medicine has expired
- Add a medicine with expiry date within 30 days to test alerts

---

## Next Steps

1. **Add medicines** through the UI
2. **Train clinic staff** on how to use the system
3. **Set up automated alerts** (see Phase 3 in MVP plan)
4. **Gather feedback** and iterate

For more information, see:
- `README.md` - Overview and project structure
- `docs/MVP_PLAN.md` - Complete MVP build plan
- `docs/USER_GUIDE.md` - End-user documentation
- `docs/DEPLOYMENT.md` - Deployment guide

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the documentation files
3. Check browser console for error messages
4. Verify Firebase configuration is correct

Good luck with your pharmacy logistics system! 🏥

