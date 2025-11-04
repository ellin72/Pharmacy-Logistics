# GitHub Setup Guide

## ⚠️ Important: Before Committing

Your `frontend/js/config.js` file contains Firebase credentials. Consider:

1. **Option 1 (Recommended for public repos):** 
   - Remove `config.js` from git tracking
   - Create `config.js.example` with placeholder values
   - Add `config.js` to `.gitignore`

2. **Option 2 (For private repos):**
   - Keep `config.js` but ensure your GitHub repo is **private**
   - Add `.env` files to `.gitignore` if you move credentials there later

---

## Step 1: Configure Git Identity

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

Or globally:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 2: Create Initial Commit

```bash
git add .
git commit -m "Initial commit: Pharmacy Logistics System MVP"
```

## Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `pharmacy-logistics` (or your preferred name)
3. Description: "Pharmacy Logistics System for Ehafo Clinic"
4. Choose **Private** (recommended since config contains credentials)
5. **Don't** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 4: Push to GitHub

After creating the repo, GitHub will show you commands. Use these:

```bash
git remote add origin https://github.com/YOUR_USERNAME/pharmacy-logistics.git
git branch -M main
git push -u origin main
```

Or if using SSH:
```bash
git remote add origin git@github.com:YOUR_USERNAME/pharmacy-logistics.git
git branch -M main
git push -u origin main
```

## Step 5: Verify

Go to your GitHub repository and verify all files are uploaded.

---

## Security Best Practices

1. **Never commit sensitive data to public repos**
2. **Use environment variables** for production
3. **Review `.gitignore`** to ensure sensitive files are excluded
4. **Use GitHub Secrets** for CI/CD if needed

---

## Future Commits

After initial setup, use:

```bash
git add .
git commit -m "Your commit message"
git push
```

