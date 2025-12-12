# User Guide - Pharmacy Logistics System

Welcome to the Pharmacy Logistics System for Ehafo Clinic. This guide will help you use the system effectively.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Logging In](#logging-in)
3. [Changing Your Password](#changing-your-password)
4. [Dashboard Overview](#dashboard-overview)
5. [Adding Medicines](#adding-medicines)
6. [Adding Stock](#adding-stock)
7. [Adjusting Stock](#adjusting-stock)
8. [Understanding Alerts](#understanding-alerts)
9. [Filtering Inventory](#filtering-inventory)
10. [Frequently Asked Questions](#frequently-asked-questions)

---

## Getting Started

### Accessing the System

1. Open your web browser (Chrome, Firefox, or Safari recommended)
2. Navigate to the system URL provided by your administrator
3. Bookmark the page for quick access

### Browser Requirements

- Modern browser (Chrome, Firefox, Safari, or Edge)
- JavaScript enabled
- Internet connection required

---

## Logging In

1. **Enter your credentials:**
   - Email: Your clinic email address
   - Password: Your assigned password

2. **Click "Log In"**

3. **First time login?**
   - Contact your administrator to create your account
   - You will see a security notification prompting you to change your password
   - **Important**: Change your default password immediately for security

4. **Forgot password?**
   - Click "Forgot Password"
   - Enter your email
   - Check your inbox for reset instructions

---

## Changing Your Password

### First Login Password Change

When you log in for the first time, you'll see a security notification at the top of the dashboard prompting you to change your password. This is required for security purposes.

**To change your password on first login:**
1. Click the **"Change Password"** button in the notification banner
2. Or click the 🔑 icon in the top right menu
3. Enter your current password
4. Enter your new password (minimum 6 characters)
5. Confirm your new password
6. Click "Change Password"

### Changing Password Later

You can change your password at any time:

1. **Click the 🔑 icon** in the top right menu (next to your email)
2. **Enter your current password**
3. **Enter your new password** (minimum 6 characters)
4. **Confirm your new password**
5. **Click "Change Password"**

**Password Requirements:**
- Minimum 6 characters
- Must be different from your current password
- Use a strong, unique password for security

**Note**: After changing your password, you'll be redirected to the dashboard and the security notification will no longer appear.

---

## Dashboard Overview

After logging in, you'll see the main dashboard with:

### Inventory Table
- Lists all medicines in stock
- Shows: Name, Batch Number, Quantity, Expiry Date, Status
- Click on a medicine row to view details

### Alerts Panel
- **Red alerts**: Expired medicines (urgent action needed)
- **Orange alerts**: Expiring soon (within 3 months)
- **Yellow alerts**: Low stock (below minimum threshold)

### Quick Actions
- **📦 Add Stock**: Quick way to add stock to existing or new medicines
- **+ Add Medicine**: Add a new medicine with full details
- **📋 Order List**: View medicines that need to be ordered
- **📊 Transaction History**: View all stock movements
- **⚡ Bulk Operations**: Import/export CSV, bulk adjustments
- **📷 Scanner**: Barcode/QR code scanner
- **Filters**: Filter by status (expired, expiring soon, low stock)

---

## Adding Stock

The **Add Stock** feature is the quickest way to add stock to your inventory. It automatically creates medicines if they don't exist.

### How to Add Stock

1. **Click "📦 Add Stock"** button (top right of dashboard)

2. **Enter medicine information:**
   - **Medicine Name**: Type or select from the dropdown (searches existing medicines)
   - **Batch Number**: Enter the batch or lot number
   - **Expiry Date**: Select the expiry date
   - **Quantity to Add**: Enter how many units you're adding
   - **Minimum Threshold**: Set the minimum stock level for alerts
   - **Notes** (optional): Any additional information

3. **Click "Add Stock"**

4. **What happens:**
   - If the medicine exists (same name + batch), stock is added to the existing record
   - If the medicine doesn't exist, a new medicine is created automatically
   - You'll see a success message and be redirected to the dashboard

**Benefits:**
- Faster than adding medicine first, then stock
- Automatically handles duplicate detection
- Streamlined workflow for daily operations

---

## Adding Medicines

Use this when you need to set up a new medicine type with all details.

1. **Click "Add Medicine" button** (top right of dashboard)

2. **Fill in the form:**
   - **Medicine Name**: Full name of the medicine (e.g., "Paracetamol 500mg")
   - **Batch Number**: Batch or lot number
   - **Expiry Date**: Select the expiry date (must be future date)
   - **Quantity**: Initial stock quantity
   - **Minimum Threshold**: Alert when stock falls below this number
   - **Notes** (optional): Any additional information

3. **Click "Save"**

4. **Confirmation**: You'll see a success message and the medicine will appear in your inventory

**Important:**
- Double-check batch numbers for accuracy
- Ensure expiry dates are correct
- Set realistic minimum thresholds

---

## Adjusting Stock

### When to Adjust Stock

- After dispensing medicine to patients
- When receiving new stock
- When correcting errors
- After inventory counts

### How to Adjust Stock

1. **Find the medicine** in the inventory table
2. **Click on the medicine row** or click "Adjust Stock"
3. **Select transaction type:**
   - **Add**: Increase stock (e.g., new shipment received)
   - **Remove**: Decrease stock (e.g., dispensed to patient)
   - **Adjust**: Set to a specific quantity (for corrections)

4. **Enter quantity:**
   - For Add/Remove: Enter the amount to add or remove
   - For Adjust: Enter the new total quantity

5. **Add reason** (optional but recommended):
   - Examples: "Restocked", "Dispensed to patient", "Inventory correction"

6. **Click "Save"**

7. **System automatically:**
   - Updates stock quantity
   - Creates transaction log
   - Updates medicine status (if needed)
   - Generates alerts (if stock is now low or expired)

---

## Understanding Alerts

### Alert Types

#### 🚨 Expired
- **Color**: Red
- **Meaning**: Medicine has passed its expiry date
- **Action**: Remove from active use immediately

#### ⚠️ Expiring Soon
- **Color**: Orange
- **Meaning**: Medicine expires within 3 months (90 days)
- **Action**: Plan to use or dispose before expiry

#### 📉 Low Stock
- **Color**: Yellow
- **Meaning**: Stock is below minimum threshold
- **Action**: Order more stock soon

### Resolving Alerts

1. **Click on an alert** in the alerts panel
2. **Review the medicine details**
3. **Take appropriate action:**
   - Low stock: Order more
   - Expiring soon: Use before expiry or dispose
   - Expired: Remove from stock
4. **Mark alert as resolved** (if applicable)

**Note**: Alerts auto-update when you adjust stock or update expiry dates.

---

## Filtering Inventory

Use the filter buttons on the dashboard:

- **All**: Show all medicines
- **Expired**: Show only expired medicines
- **Expiring Soon**: Show medicines expiring within 3 months
- **Low Stock**: Show medicines below threshold
- **In Stock**: Show medicines with adequate stock

You can also use the search box to find medicines by name or batch number.

---

## Frequently Asked Questions

### Q: What if I make a mistake entering data?
**A**: You can adjust stock to correct quantities. For other errors, contact your administrator.

### Q: Can I delete a medicine?
**A**: Only administrators can delete medicines. Contact your administrator if a medicine should be removed.

### Q: How often are alerts updated?
**A**: Alerts are updated automatically when:
- Stock changes
- Expiry dates pass
- Daily automated checks run (cloud function)

### Q: Can I use this offline?
**A**: Yes! The system works as a Progressive Web App (PWA) and supports offline functionality. You can:
- View cached inventory data offline
- Queue operations when offline (they'll sync when connection is restored)
- Install the app on your device for better offline access

### Q: How do I print reports?
**A**: You can print inventory and transaction reports:
- Click the **🖨️ Print** button on the dashboard or transactions page
- Use your browser's print function (Ctrl+P / Cmd+P)
- Reports include clinic branding and professional formatting

### Q: How do I export data?
**A**: Export functionality is available:
- **CSV Export**: Click **📥 Export** button on dashboard or transactions page
- Export includes all current inventory or transaction data
- Open in Excel or Google Sheets for further analysis

### Q: How do I change my password?
**A**: Click the **🔑** icon in the top right menu, or use the notification banner on first login. You'll need to enter your current password for security.

### Q: Who can see this data?
**A**: Only logged-in users from your clinic can access the system.

### Q: What happens to expired medicines?
**A**: The system marks them as expired. You should:
1. Remove them from active storage
2. Dispose according to clinic protocols
3. Update quantity to 0 if removing from system

---

## Tips for Best Practices

1. **Regular Updates**: Update stock immediately after transactions
2. **Check Alerts Daily**: Review alerts panel each day
3. **Accurate Data**: Double-check batch numbers and expiry dates
4. **Use Reasons**: Always include reasons when adjusting stock
5. **Report Issues**: Contact administrator if you notice system errors

---

## Getting Help

If you encounter issues or have questions:

1. **Check this guide** first
2. **Contact your system administrator**
3. **Report bugs** through your administrator
4. **Request training** if needed

---

## Quick Reference

| Action | Steps |
|--------|-------|
| Add Stock | Dashboard → Add Stock → Enter details → Save |
| Add Medicine | Dashboard → Add Medicine → Fill form → Save |
| Adjust Stock | Find medicine → Click Adjust → Select type → Enter quantity → Save |
| Change Password | Click 🔑 icon → Enter current & new password → Save |
| View Alerts | Check alerts panel on dashboard |
| Filter Inventory | Click filter buttons (All, Expired, Low Stock, etc.) |
| Search Medicine | Type name or batch number in search box (Ctrl+F / Cmd+F) |
| Export Data | Click 📥 Export button → Download CSV |
| Print Report | Click 🖨️ Print button → Print dialog |
| Log Out | Click Log Out button in top right |

---

**Last Updated**: 2024  
**Version**: 2.0  
**Status**: Production Ready

