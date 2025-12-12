# 🏥 Pharmacy Logistics System - Ehafo Clinic

A comprehensive, clinic-ready inventory management system for tracking medications with expiry dates, batch numbers, and stock levels. Built with Firebase for real-time synchronization and offline support.

## 🎯 Core Features

### Inventory Management
- ✅ **Track medications** with expiry dates, batch numbers, and stock levels
- ✅ **Add Stock** - Quick stock addition with automatic medicine creation
- ✅ **Add Medicine** - Full medicine entry with all details
- ✅ **Adjust Stock** - Add, remove, or adjust stock quantities
- ✅ **Bulk Operations** - Import/export CSV, bulk stock adjustments
- ✅ **Barcode Scanner** - Scan barcodes to quickly find medicines
- ✅ **Real-time Updates** - Live inventory synchronization across devices

### Automated Alerts & Monitoring
- ✅ **Expiring Soon** - Alerts for medicines expiring within 3 months (90 days)
- ✅ **Low Stock** - Automatic alerts when stock falls below threshold
- ✅ **Expired Medicines** - Immediate alerts for expired items
- ✅ **Alert Dashboard** - Centralized alert management panel
- ✅ **Email Notifications** - Configurable email alerts (optional)

### Dashboard & Reporting
- ✅ **Interactive Dashboard** - Real-time inventory overview with statistics
- ✅ **Smart Filtering** - Filter by status (expired, expiring soon, low stock, in stock)
- ✅ **Search Functionality** - Search by medicine name or batch number
- ✅ **Transaction History** - Complete audit trail of all stock movements
- ✅ **Order List** - Generate lists of low stock items for ordering
- ✅ **Export & Print** - Export inventory to CSV or print reports

### User Management & Security
- ✅ **Role-Based Access** - Admin and Staff roles with appropriate permissions
- ✅ **Secure Authentication** - Firebase Authentication with email/password
- ✅ **User Management** - Admin can manage user roles and permissions
- ✅ **Audit Trail** - All actions logged with user and timestamp

### Advanced Features
- ✅ **Offline Support** - Progressive Web App (PWA) with offline functionality
- ✅ **Service Worker** - Caches data for offline access
- ✅ **Conflict Resolution** - Handles data conflicts when syncing
- ✅ **Seed Medicines** - Admin tool to bulk-add medicine templates
- ✅ **Print Styling** - Professional print layouts with clinic branding

## 📁 Project Structure

```
Pharmacy-Logistics/
├── frontend/
│   ├── index.html              # Login page
│   ├── dashboard.html          # Main dashboard
│   ├── add-medicine.html       # Add medicine form
│   ├── add-stock.html          # Quick add stock page
│   ├── adjust-stock.html       # Adjust stock form
│   ├── barcode-scanner.html    # Barcode scanner interface
│   ├── bulk-operations.html    # Bulk import/export
│   ├── transactions.html       # Transaction history
│   ├── order-list.html         # Low stock order list
│   ├── notifications-settings.html  # Notification preferences
│   ├── seed-medicines.html     # Admin: Seed medicine templates
│   ├── css/
│   │   └── styles.css          # Main stylesheet
│   ├── js/
│   │   ├── config.js           # Firebase configuration
│   │   ├── auth.js             # Authentication logic
│   │   ├── inventory.js        # Inventory management
│   │   ├── alerts.js           # Alert system
│   │   ├── transactions.js     # Transaction management
│   │   ├── notifications.js    # Notification system
│   │   ├── barcode.js          # Barcode scanning
│   │   ├── offline.js          # Offline support
│   │   ├── indexeddb.js        # Local storage
│   │   ├── users.js            # User management
│   │   └── reports.js          # Reporting functions
│   ├── sw.js                   # Service worker (PWA)
│   ├── manifest.json           # PWA manifest
│   └── images/                 # Images and icons
├── database/
│   ├── schema.md               # Data model documentation
│   └── seed-data.json          # Sample data
├── docs/
│   ├── MVP_PLAN.md             # Detailed MVP build plan
│   ├── DEPLOYMENT.md           # Deployment instructions
│   ├── USER_GUIDE.md           # User manual
│   ├── TROUBLESHOOTING.md     # Troubleshooting guide
│   ├── SECURITY_PERMISSIONS.md # Security documentation
│   └── [other documentation files]
├── firebase.json               # Firebase configuration
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Firebase account (free tier available)
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Node.js (optional, for local development)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Pharmacy-Logistics
   ```

2. **Set up Firebase**
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Copy your Firebase config and add it to `frontend/js/config.js`

3. **Configure Firebase**
   - Edit `frontend/js/config.js` with your Firebase credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

4. **Set up Firestore Security Rules**
   - Copy rules from `docs/FIRESTORE_RULES_FINAL.rules`
   - Paste into Firebase Console → Firestore Database → Rules
   - See `docs/SECURITY_PERMISSIONS.md` for detailed security setup

5. **Open the application**
   - Serve the `frontend` folder using a local server:
     - Python: `python -m http.server 8000`
     - Node.js: `npx http-server frontend -p 8000`
     - VS Code: Use Live Server extension
   - Or deploy to Firebase Hosting (see `docs/DEPLOYMENT.md`)

6. **Initial Setup**
   - Create your first admin account via Firebase Console → Authentication
   - Set user role to 'admin' in Firestore `users` collection
   - Log in and use "Seed Medicines" (admin only) to add medicine templates
   - Start adding stock through the "Add Stock" page

## 📊 Data Model

### Collections

#### `medicines`
- `name` (string): Medicine name
- `batch` (string): Batch number
- `expiryDate` (timestamp): Expiry date
- `quantity` (number): Current stock quantity (only medicines with quantity > 0 shown on dashboard)
- `minThreshold` (number): Minimum stock threshold
- `status` (string): "in_stock", "low_stock", "expired", "expiring_soon"
- `createdAt` (timestamp): Creation date
- `updatedAt` (timestamp): Last update date
- `createdBy` (string): User ID who created the record
- `notes` (string): Optional notes

#### `transactions`
- `medicineId` (string): Reference to medicine
- `type` (string): "add", "remove", "adjust"
- `quantity` (number): Quantity changed (positive for add, negative for remove)
- `previousQuantity` (number): Stock before transaction
- `newQuantity` (number): Stock after transaction
- `reason` (string): Optional reason for transaction
- `userId` (string): User who made the change
- `timestamp` (timestamp): Transaction time

#### `alerts`
- `medicineId` (string): Reference to medicine
- `medicineName` (string): Medicine name (for quick reference)
- `type` (string): "expiry_soon", "low_stock", "expired"
- `dueOn` (timestamp): Alert due date (for expiry alerts)
- `resolved` (boolean): Whether alert has been resolved
- `severity` (string): "high", "medium", "low"
- `createdAt` (timestamp): Alert creation time

#### `users`
- `email` (string): User email
- `role` (string): "admin" or "staff"
- `displayName` (string): User display name
- `createdAt` (timestamp): Account creation date

See `database/schema.md` for detailed schema documentation.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend/DB**: Firebase (Firestore + Auth + Hosting)
- **PWA**: Service Worker, IndexedDB for offline support
- **Deployment**: Firebase Hosting (recommended) or Netlify/Vercel

## 🔐 User Roles

### Admin (Pharmacist/Clinic Manager)
- Full access to all features
- Can delete medicines
- Can manage user roles
- Can seed medicine templates
- Can view all transactions
- Can modify security settings

### Staff
- Can add/remove stock
- Can view inventory
- Can create medicines
- Can view transactions
- Cannot delete medicines
- Cannot manage users

## ✨ Key Features Explained

### Add Stock vs Add Medicine
- **Add Stock**: Quick way to add stock to existing medicines or create new ones. Perfect for daily stock operations.
- **Add Medicine**: Full medicine entry form with all details. Use when you need to set up a new medicine type.

### Dashboard Filtering
- The dashboard **only shows medicines with stock** (quantity > 0)
- Medicines with 0 quantity are hidden but can be found via search
- Use filters to view: All, Expired, Expiring Soon, Low Stock, or In Stock

### Alert System
- **Expiring Soon**: Triggers 3 months (90 days) before expiry
- **Low Stock**: Triggers when quantity falls below minimum threshold
- **Expired**: Triggers immediately when expiry date passes
- Alerts auto-update when stock or expiry dates change

### Offline Support
- System works offline using cached data
- Changes are queued and synced when connection is restored
- Conflict resolution handles simultaneous edits

## 📚 Documentation

- [MVP Build Plan](docs/MVP_PLAN.md) - Detailed implementation plan
- [User Guide](docs/USER_GUIDE.md) - End-user documentation
- [Deployment Guide](docs/DEPLOYMENT.md) - How to deploy to production
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Security Setup](docs/SECURITY_PERMISSIONS.md) - Security configuration
- [Quick Setup Roles](docs/QUICK_SETUP_ROLES.md) - User role setup guide

## 🐛 Known Issues & Limitations

- Dashboard shows only medicines with stock (quantity > 0)
- Expiry warning set to 3 months (90 days) - configurable in `frontend/js/inventory.js`
- Real-time listener errors don't clear inventory (by design - preserves data during network issues)
- Print elements hidden on screen by default (by design - shown only when printing)

## 🚧 Future Enhancements

See `docs/IMPROVEMENTS_ROADMAP.md` for planned features:
- Advanced analytics and reporting
- SMS notifications
- Multi-location support
- Supplier management
- Purchase order tracking

## 🤝 Contributing

This is a clinic-specific project for Ehafo Clinic. For improvements or issues, please contact the project administrator.

## 📄 License

Proprietary - Ehafo Clinic Internal Use

## 🆘 Support

For setup issues or questions:
1. Check the documentation in the `docs/` folder
2. Review `docs/TROUBLESHOOTING.md` for common issues
3. Contact the development team

## 📝 Changelog

### Recent Updates
- ✅ Added "Add Stock" page for quick stock operations
- ✅ Implemented medicine seeding for bulk template creation
- ✅ Updated expiry warning to 3 months (90 days)
- ✅ Dashboard now filters to show only medicines with stock
- ✅ Added admin-only features (seed medicines, user management)
- ✅ Improved offline support and conflict resolution
- ✅ Enhanced print functionality with clinic branding

---

**Version**: 1.0  
**Last Updated**: 2024  
**Maintained by**: Ehafo Clinic Development Team
