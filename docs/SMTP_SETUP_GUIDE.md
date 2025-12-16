# Gmail SMTP Configuration Guide

This guide will help you configure Gmail SMTP for email notifications in your Pharmacy Logistics system.

## ⚠️ Important: Gmail App Password Required

Gmail requires an **App Password** (not your regular password) for third-party applications. Your regular password (`Rosaliah@2165960`) may not work directly.

### Step 1: Generate a Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable it if not already enabled)
3. Scroll down to **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter a name like "Pharmacy Logistics"
6. Click **Generate**
7. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

### Step 2: Login to Firebase CLI

Open PowerShell or Command Prompt in your project directory and run:

```bash
firebase login
```

This will open a browser window. Sign in with your Google account that has access to the Firebase project.

### Step 3: Set Active Firebase Project

```bash
firebase use ehafo-pharmacy-logistics-3ca06
```

### Step 4: Configure SMTP Settings

**Option A: Using Regular Password (may not work)**

```bash
firebase functions:config:set smtp.host="smtp.gmail.com" smtp.port="587" smtp.secure="false" smtp.user="shitunaelin@gmail.com" smtp.pass="Rosaliah@2165960" smtp.from="Pharmacy Logistics <shitunaelin@gmail.com>"
```

**Option B: Using App Password (Recommended - use the 16-character password from Step 1)**

Replace `YOUR_APP_PASSWORD` with the 16-character app password you generated:

```bash
firebase functions:config:set smtp.host="smtp.gmail.com" smtp.port="587" smtp.secure="false" smtp.user="shitunaelin@gmail.com" smtp.pass="mkxfygacgdlzeeeo" smtp.from="Pharmacy Logistics <shitunaelin@gmail.com>"
```

**Note:** Remove spaces from the app password when entering it (e.g., `abcdefghijklmnop` instead of `abcd efgh ijkl mnop`).

### Step 5: Verify Configuration

Check that the configuration was saved correctly:

```bash
firebase functions:config:get smtp
```

You should see your SMTP settings (password will be hidden for security).

### Step 6: Install Function Dependencies

```bash
cd functions
npm install
cd ..
```

### Step 7: Deploy the Cloud Function

```bash
firebase deploy --only functions
```

## Testing the Configuration

After deployment:

1. Log in to your Pharmacy Logistics app
2. Go to **Notification Settings**
3. Enable **Email Notifications** with **Immediate** frequency
4. Trigger an alert (e.g., add an expired medicine)
5. Check your email inbox for the notification

## Troubleshooting

### "Invalid login" or authentication errors

- Make sure you're using a **Gmail App Password**, not your regular password
- Verify 2-Step Verification is enabled on your Google account
- Check that the app password was copied correctly (no spaces)

### Function deployment fails

- Ensure you're logged in: `firebase login:list`
- Verify project is set: `firebase use`
- Check that you have the necessary permissions in Firebase Console

### Emails not sending

- Check Cloud Functions logs: `firebase functions:log`
- Verify the `mail` collection in Firestore has documents with `sent: false` and check the `error` field
- Test SMTP connection manually if needed

## Security Notes

- **Never commit SMTP passwords to Git**
- The password is stored securely in Firebase Functions config
- Consider using environment variables or Firebase Secret Manager for production
