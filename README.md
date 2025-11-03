# 🏥 Pharmacy Logistics System - Ehafo Clinic MVP

A lightweight, clinic-ready inventory management system for tracking medications with expiry dates, batch numbers, and stock levels.

## 🎯 Core Features

- ✅ Track medications with expiry dates, batch numbers, and stock levels
- ✅ Add/remove/adjust stock operations
- ✅ Automated alerts for:
  - Expiring soon (within 30 days)
  - Low stock (below threshold)
- ✅ Simple dashboard for clinic staff
- ✅ Lightweight, offline-resilient, and easy to maintain

## 📁 Project Structure

```
Pharmacy-Logistics/
├── frontend/
│   ├── index.html          # Login page
│   ├── dashboard.html      # Main dashboard
│   ├── add-medicine.html   # Add medicine form
│   ├── adjust-stock.html   # Adjust stock form
│   ├── css/
│   │   └── styles.css      # Main stylesheet
│   ├── js/
│   │   ├── config.js       # Firebase configuration
│   │   ├── auth.js         # Authentication logic
│   │   ├── inventory.js    # Inventory management
│   │   └── alerts.js        # Alert system
│   └── assets/
│       └── (images/icons)
├── database/
│   ├── schema.md           # Data model documentation
│   └── seed-data.json      # Sample data (optional)
├── docs/
│   ├── MVP_PLAN.md         # Detailed MVP build plan
│   ├── DEPLOYMENT.md        # Deployment instructions
│   └── USER_GUIDE.md        # User manual
├── tests/
│   └── (test files)
└── README.md

```

## 🚀 Quick Start

### Prerequisites

- Node.js (optional, for local development)
- Firebase account
- Modern web browser

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

4. **Open the application**
   - Serve the `frontend` folder using a local server:
     - Python: `python -m http.server 8000`
     - Node.js: `npx http-server frontend -p 8000`
     - VS Code: Use Live Server extension
   - Or deploy to Firebase Hosting (see `docs/DEPLOYMENT.md`)

5. **Initial Setup**
   - Create your first admin account via Firebase Console → Authentication
   - Start adding medicines through the dashboard

## 📊 Data Model

### Collections

#### `medicines`
- `name` (string): Medicine name
- `batch` (string): Batch number
- `expiryDate` (timestamp): Expiry date
- `quantity` (number): Current stock quantity
- `minThreshold` (number): Minimum stock threshold
- `status` (string): "in_stock", "low_stock", "expired", "expiring_soon"
- `createdAt` (timestamp): Creation date
- `updatedAt` (timestamp): Last update date

#### `transactions`
- `medicineId` (string): Reference to medicine
- `type` (string): "add", "remove", "adjust"
- `quantity` (number): Quantity changed
- `reason` (string): Optional reason for transaction
- `userId` (string): User who made the change
- `timestamp` (timestamp): Transaction time

#### `alerts`
- `medicineId` (string): Reference to medicine
- `type` (string): "expiry_soon", "low_stock", "expired"
- `dueOn` (timestamp): Alert due date
- `resolved` (boolean): Whether alert has been resolved
- `createdAt` (timestamp): Alert creation time

See `database/schema.md` for detailed schema documentation.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (MVP)
- **Backend/DB**: Firebase (Firestore + Auth + Hosting)
- **Deployment**: Firebase Hosting (recommended) or Netlify/Vercel

## 📌 MVP Timeline

| Week | Milestone |
|------|-----------|
| 1–2  | ✅ Requirements, repo setup, data model, mockups |
| 3–4  | 🔄 Auth + Inventory CRUD + Dashboard |
| 5–6  | ⏳ Automation (expiry/low stock alerts) |
| 7    | ⏳ Deployment + Testing at Ehafo Clinic |
| 8+   | ⏳ Feedback, iteration, advanced features |

## 🔐 User Roles

- **Admin** (Pharmacist/Clinic Manager): Full access to all features
- **Staff**: Can add/remove stock, view inventory

## 📝 Development Notes

- This is an MVP - keep it simple and functional
- Focus on core features first, expand later
- Test with real clinic staff for feedback
- Plan for offline-first features in future iterations

## 📚 Documentation

- [MVP Build Plan](docs/MVP_PLAN.md) - Detailed implementation plan
- [Deployment Guide](docs/DEPLOYMENT.md) - How to deploy to production
- [User Guide](docs/USER_GUIDE.md) - End-user documentation

## 🤝 Contributing

This is a clinic-specific project for Ehafo Clinic. For improvements or issues, please contact the project administrator.

## 📄 License

Proprietary - Ehafo Clinic Internal Use

## 🆘 Support

For setup issues or questions, refer to the documentation in the `docs/` folder or contact the development team.

