# Gmail SMTP Configuration Script for Pharmacy Logistics
# Run this AFTER you've logged in to Firebase (firebase login)

Write-Host "Configuring Gmail SMTP for Pharmacy Logistics..." -ForegroundColor Cyan

# Check if Firebase CLI is available
try {
    $firebaseVersion = firebase --version
    Write-Host "Firebase CLI found: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "  npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
$loginStatus = firebase login:list 2>&1
if ($loginStatus -match "No authorized accounts") {
    Write-Host "ERROR: Not logged in to Firebase. Please run:" -ForegroundColor Red
    Write-Host "  firebase login" -ForegroundColor Yellow
    exit 1
}

# Set active project
Write-Host "`nSetting active Firebase project..." -ForegroundColor Cyan
firebase use ehafo-pharmacy-logistics-3ca06

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to set project. Make sure you have access to this project." -ForegroundColor Red
    exit 1
}

# Prompt for App Password
Write-Host "`n⚠️  IMPORTANT: Gmail requires an App Password (not your regular password)" -ForegroundColor Yellow
Write-Host "If you haven't created one yet, see: docs/SMTP_SETUP_GUIDE.md" -ForegroundColor Yellow
Write-Host "`nEnter your Gmail App Password (16 characters, no spaces):" -ForegroundColor Cyan
$appPassword = Read-Host -AsSecureString
$appPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($appPassword))

# Configure SMTP
Write-Host "`nConfiguring SMTP settings..." -ForegroundColor Cyan
firebase functions:config:set `
    smtp.host="smtp.gmail.com" `
    smtp.port="587" `
    smtp.secure="false" `
    smtp.user="shitunaelin@gmail.com" `
    smtp.pass="$appPasswordPlain" `
    smtp.from="Pharmacy Logistics <shitunaelin@gmail.com>"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ SMTP configuration saved successfully!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Install function dependencies: cd functions && npm install" -ForegroundColor Yellow
    Write-Host "2. Deploy the function: firebase deploy --only functions" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Failed to configure SMTP. Check the error above." -ForegroundColor Red
    exit 1
}
