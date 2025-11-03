# Deployment Guide

This guide walks you through deploying the Pharmacy Logistics System to production.

## Prerequisites

- Firebase account (free tier is sufficient for MVP)
- Node.js and npm installed (for Firebase CLI)
- Git installed (if using version control)

---

## Step 1: Firebase Project Setup

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com
   - Click "Add project"
   - Name it (e.g., "ehafo-pharmacy-logistics")
   - Enable Google Analytics (optional)

2. **Enable Authentication**
   - In Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password" provider
   - Save

3. **Create Firestore Database**
   - In Firebase Console → Firestore Database
   - Click "Create database"
   - Start in **production mode** (we'll set security rules later)
   - Choose a location (select closest to your region)
   - Enable

4. **Get Firebase Config**
   - In Firebase Console → Project Settings (gear icon)
   - Scroll to "Your apps" section
   - Click web icon (`</>`) to add a web app
   - Register app with a nickname (e.g., "Ehafo Pharmacy")
   - Copy the `firebaseConfig` object
   - Update `frontend/js/config.js` with your config

---

## Step 2: Set Firestore Security Rules

1. **In Firebase Console → Firestore Database → Rules**
2. Copy the security rules from `database/schema.md`
3. Paste and publish

**Note**: For MVP, you can start with simpler rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Refine rules later based on your role requirements.

---

## Step 3: Install Firebase CLI

```bash
npm install -g firebase-tools
```

---

## Step 4: Initialize Firebase Hosting

1. **Login to Firebase**
   ```bash
   firebase login
   ```

2. **Initialize Firebase in your project**
   ```bash
   cd Pharmacy-Logistics
   firebase init
   ```

3. **Select options:**
   - ✅ Hosting
   - ✅ Use an existing project (select your project)
   - Public directory: `frontend`
   - Single-page app: `No` (unless you set up routing)
   - Automatic builds: `No` (for now)

---

## Step 5: Create firebase.json

Create `firebase.json` in the project root:

```json
{
  "hosting": {
    "public": "frontend",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

---

## Step 6: Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Your app will be available at:
```
https://your-project-id.web.app
https://your-project-id.firebaseapp.com
```

---

## Alternative: Deploy to Netlify

1. **Create Netlify account** at https://www.netlify.com
2. **Install Netlify CLI** (optional):
   ```bash
   npm install -g netlify-cli
   ```
3. **Deploy via drag-and-drop:**
   - Go to Netlify dashboard
   - Drag the `frontend` folder to the deploy area
   - Your site is live!

4. **Or deploy via CLI:**
   ```bash
   netlify deploy --dir=frontend --prod
   ```

---

## Alternative: Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```
2. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```
3. Follow prompts and your app will be live.

---

## Step 7: Set Up Custom Domain (Optional)

### Firebase Hosting:
1. In Firebase Console → Hosting → Add custom domain
2. Follow instructions to verify domain ownership
3. Add DNS records as instructed

### Netlify/Vercel:
- Similar process in their dashboards

---

## Step 8: Environment Configuration

For different environments (dev, staging, prod), consider using:

1. **Firebase Config Environments:**
   - Create separate Firebase projects for dev/prod
   - Use different config files: `config.dev.js`, `config.prod.js`
   - Swap them based on environment

2. **Or use environment variables:**
   - Store config in environment variables (requires build step)
   - Use a bundler like Webpack or Vite

---

## Step 9: Set Up Automated Alerts (Cloud Functions)

1. **Initialize Functions:**
   ```bash
   firebase init functions
   ```

2. **Install dependencies:**
   ```bash
   cd functions
   npm install
   ```

3. **Create daily alert check function** (see Phase 3 in MVP plan)

4. **Deploy:**
   ```bash
   firebase deploy --only functions
   ```

---

## Post-Deployment Checklist

- [ ] Test login functionality
- [ ] Add first admin user via Firebase Console → Authentication
- [ ] Test adding a medicine
- [ ] Test adjusting stock
- [ ] Verify alerts appear correctly
- [ ] Check mobile responsiveness
- [ ] Test on clinic devices
- [ ] Train staff on usage

---

## Monitoring & Maintenance

1. **Firebase Console**:
   - Monitor usage and costs
   - Check Firestore usage
   - Review authentication logs

2. **Error Tracking**:
   - Consider adding Sentry or similar for error tracking
   - Monitor browser console errors

3. **Backup**:
   - Export Firestore data regularly
   - Keep backup of Firebase config

---

## Troubleshooting

### Issue: "Firebase not configured"
- **Solution**: Check that `config.js` has correct Firebase credentials

### Issue: "Permission denied" in Firestore
- **Solution**: Check security rules in Firestore Console

### Issue: CORS errors
- **Solution**: Ensure Firebase config matches your domain in Firebase Console

### Issue: Site not updating after deploy
- **Solution**: Clear browser cache or do hard refresh (Ctrl+F5)

---

## Rollback

If something goes wrong:

1. **Firebase Hosting:**
   ```bash
   firebase hosting:channel:list
   firebase hosting:channel:deploy previous-version
   ```

2. **Git:**
   ```bash
   git checkout previous-commit
   firebase deploy --only hosting
   ```

---

For more details, refer to:
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Netlify Docs](https://docs.netlify.com/)
- [Vercel Docs](https://vercel.com/docs)

