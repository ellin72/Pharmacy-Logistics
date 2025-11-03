# User Guide - Pharmacy Logistics System

Welcome to the Pharmacy Logistics System for Ehafo Clinic. This guide will help you use the system effectively.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Logging In](#logging-in)
3. [Dashboard Overview](#dashboard-overview)
4. [Adding Medicines](#adding-medicines)
5. [Adjusting Stock](#adjusting-stock)
6. [Understanding Alerts](#understanding-alerts)
7. [Filtering Inventory](#filtering-inventory)
8. [Frequently Asked Questions](#frequently-asked-questions)

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
   - You may need to reset your password on first login

4. **Forgot password?**
   - Click "Forgot Password"
   - Enter your email
   - Check your inbox for reset instructions

---

## Dashboard Overview

After logging in, you'll see the main dashboard with:

### Inventory Table
- Lists all medicines in stock
- Shows: Name, Batch Number, Quantity, Expiry Date, Status
- Click on a medicine row to view details

### Alerts Panel
- **Red alerts**: Expired medicines (urgent action needed)
- **Orange alerts**: Expiring soon (within 30 days)
- **Yellow alerts**: Low stock (below minimum threshold)

### Quick Actions
- **Add Medicine**: Add a new medicine to inventory
- **Adjust Stock**: Update stock levels
- **View All**: Show all medicines
- **Filters**: Filter by status (expired, expiring soon, low stock)

---

## Adding Medicines

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
- **Meaning**: Medicine expires within 30 days
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
- **Expiring Soon**: Show medicines expiring within 30 days
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
**A**: Currently, an internet connection is required. Offline support is planned for future updates.

### Q: How do I print reports?
**A**: Export functionality is coming in a future update. For now, you can take screenshots or contact your administrator.

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
| Add Medicine | Dashboard → Add Medicine → Fill form → Save |
| Adjust Stock | Find medicine → Click Adjust → Select type → Enter quantity → Save |
| View Alerts | Check alerts panel on dashboard |
| Filter Inventory | Click filter buttons (All, Expired, Low Stock, etc.) |
| Search Medicine | Type name or batch number in search box |
| Log Out | Click your name/profile → Log Out |

---

**Last Updated**: [Update this date]
**Version**: MVP 1.0

