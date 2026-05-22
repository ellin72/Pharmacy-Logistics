# Database Schema Documentation

This document describes the Firestore database structure for the Pharmacy Logistics System.

## Collections

### `medicines`

Stores all medicine inventory information.

| Field          | Type      | Required | Description                                                                 |
| -------------- | --------- | -------- | --------------------------------------------------------------------------- |
| `name`         | string    | Yes      | Full name of the medicine                                                   |
| `batch`        | string    | Yes      | Batch or lot number                                                         |
| `expiryDate`   | timestamp | Yes      | Expiry date of the medicine                                                 |
| `quantity`     | number    | Yes      | Current stock quantity (>= 0)                                               |
| `minThreshold` | number    | Yes      | Minimum stock level before low stock alert                                  |
| `status`       | string    | Yes      | Current status: `"in_stock"`, `"low_stock"`, `"expired"`, `"expiring_soon"` |
| `createdAt`    | timestamp | Yes      | When the medicine was added to system                                       |
| `updatedAt`    | timestamp | Yes      | Last modification timestamp                                                 |
| `createdBy`    | string    | Optional | User ID who created the record                                              |
| `notes`        | string    | Optional | Additional notes about the medicine                                         |

**Example:**

```json
{
  "name": "Paracetamol 500mg",
  "batch": "BATCH-2024-001",
  "expiryDate": "2025-12-31T00:00:00Z",
  "quantity": 150,
  "minThreshold": 50,
  "status": "in_stock",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:22:00Z",
  "createdBy": "user123",
  "notes": "Store in cool, dry place"
}
```

---

### `transactions`

Logs all stock movements (add, remove, adjust).

| Field              | Type      | Required | Description                                                            |
| ------------------ | --------- | -------- | ---------------------------------------------------------------------- |
| `medicineId`       | string    | Yes      | Reference to medicine document ID                                      |
| `type`             | string    | Yes      | Transaction type: `"add"`, `"remove"`, `"adjust"`                      |
| `quantity`         | number    | Yes      | Quantity changed (positive for add, negative for remove)               |
| `previousQuantity` | number    | Yes      | Stock quantity before this transaction                                 |
| `newQuantity`      | number    | Yes      | Stock quantity after this transaction                                  |
| `reason`           | string    | Optional | Reason for the transaction (e.g., "Restocked", "Dispensed to patient") |
| `userId`           | string    | Yes      | User ID who performed the transaction                                  |
| `timestamp`        | timestamp | Yes      | When the transaction occurred                                          |

**Example:**

```json
{
  "medicineId": "med123",
  "type": "add",
  "quantity": 50,
  "previousQuantity": 100,
  "newQuantity": 150,
  "reason": "Monthly restock",
  "userId": "user123",
  "timestamp": "2024-01-20T14:22:00Z"
}
```

---

### `alerts`

Stores active and resolved alerts for expiry and low stock.

| Field          | Type      | Required | Description                                             |
| -------------- | --------- | -------- | ------------------------------------------------------- |
| `medicineId`   | string    | Yes      | Reference to medicine document ID                       |
| `medicineName` | string    | Yes      | Cached medicine name for quick display                  |
| `type`         | string    | Yes      | Alert type: `"expiry_soon"`, `"low_stock"`, `"expired"` |
| `dueOn`        | timestamp | Optional | For expiry alerts, the expiry date                      |
| `resolved`     | boolean   | Yes      | Whether the alert has been resolved                     |
| `resolvedAt`   | timestamp | Optional | When the alert was resolved                             |
| `resolvedBy`   | string    | Optional | User ID who resolved the alert                          |
| `createdAt`    | timestamp | Yes      | When the alert was created                              |
| `severity`     | string    | Optional | Alert severity: `"low"`, `"medium"`, `"high"`           |

**Example:**

```json
{
  "medicineId": "med123",
  "medicineName": "Paracetamol 500mg",
  "type": "expiry_soon",
  "dueOn": "2024-02-15T00:00:00Z",
  "resolved": false,
  "createdAt": "2024-01-20T10:00:00Z",
  "severity": "high"
}
```

---

### `users`

Stores additional user information beyond Firebase Auth. Created automatically on first login.

| Field               | Type      | Required | Description                                                             |
| ------------------- | --------- | -------- | ----------------------------------------------------------------------- |
| `email`             | string    | Yes      | User email (from Firebase Auth)                                         |
| `role`              | string    | Yes      | User role: `"admin"`, `"staff"`                                         |
| `displayName`       | string    | Optional | User's display name                                                     |
| `passwordChanged`   | boolean   | Yes      | Whether user has changed their password from default (default: `false`) |
| `passwordChangedAt` | timestamp | Optional | When the password was last changed                                      |
| `createdAt`         | timestamp | Yes      | Account creation date                                                   |

**Example:**

```json
{
  "email": "staff@ehafoclinic.com",
  "role": "staff",
  "displayName": "John Doe",
  "passwordChanged": true,
  "passwordChangedAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-10T08:00:00Z"
}
```

**Notes:**

- User documents are created automatically on first login
- Default role is `"staff"` - admins must manually set role to `"admin"` in Firestore
- `passwordChanged` is set to `false` for new users, prompting password change on first login
- Users can change their password via the Change Password page

---

### `notificationPreferences`

Stores user notification preferences.

| Field            | Type      | Required | Description                                                     |
| ---------------- | --------- | -------- | --------------------------------------------------------------- |
| `emailEnabled`   | boolean   | Yes      | Whether email notifications are enabled                         |
| `emailFrequency` | string    | Yes      | Frequency: `"immediate"`, `"daily"`, `"weekly"`                 |
| `types`          | object    | Yes      | Object with `expired`, `expiry_soon`, `low_stock` boolean flags |
| `lastEmailSent`  | timestamp | Optional | Last time email notification was sent                           |
| `updatedAt`      | timestamp | Yes      | Last update timestamp                                           |

**Example:**

```json
{
  "emailEnabled": true,
  "emailFrequency": "daily",
  "types": {
    "expired": true,
    "expiry_soon": true,
    "low_stock": false
  },
  "lastEmailSent": "2024-01-20T10:00:00Z",
  "updatedAt": "2024-01-20T10:00:00Z"
}
```

---

## Firestore Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Medicines collection
    match /medicines/{medicineId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // Transactions collection
    match /transactions/{transactionId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }

    // Alerts collection
    match /alerts/{alertId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated(); // Users can resolve alerts
      allow delete: if isAdmin();
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }
  }
}
```

---

## Indexes Required

Firestore may require composite indexes for queries like:

- `medicines` collection: Filter by `status` and order by `expiryDate`
- `alerts` collection: Filter by `resolved` and `type`, order by `createdAt`

These will be created automatically when you run the queries, or you can create them manually in the Firebase Console.

---

## Data Validation

Consider implementing client-side and cloud function validation:

- `quantity` must be >= 0
- `expiryDate` must be a valid future date (when creating)
- `minThreshold` should be >= 0
- `status` must be one of the allowed values
- Transaction `quantity` must match the change in stock

---

### `medicines` — updated fields (soft delete + category)

| Field       | Type      | Description                                                             |
| ----------- | --------- | ----------------------------------------------------------------------- |
| `category`  | string    | Medicine category (e.g., `"Antibiotics"`, `"Analgesics"`, `"Vaccines"`) |
| `deleted`   | boolean   | Soft-delete flag. `true` = removed from all views. Default: `false`     |
| `deletedAt` | timestamp | When the medicine was soft-deleted                                      |
| `deletedBy` | string    | User UID who performed the soft-delete                                  |

---

### `emergencyOrders`

Stores urgent medicine order requests from staff and their approval workflow.

| Field               | Type      | Required | Description                                                              |
| ------------------- | --------- | -------- | ------------------------------------------------------------------------ |
| `medicineId`        | string    | Yes      | Reference to medicine document                                           |
| `medicineName`      | string    | Yes      | Cached medicine name                                                     |
| `requestedQuantity` | number    | Yes      | Units requested                                                          |
| `currentStock`      | number    | Yes      | Stock at time of request                                                 |
| `minThreshold`      | number    | Yes      | Min threshold at time of request                                         |
| `reason`            | string    | Yes      | Reason for emergency order (≥5 chars)                                    |
| `requestedBy`       | string    | Yes      | UID of the requesting user                                               |
| `requestedByEmail`  | string    | Yes      | Email of the requesting user                                             |
| `requestedAt`       | timestamp | Yes      | When request was created                                                 |
| `status`            | string    | Yes      | `"pending"` → `"approved"` → `"ordered"` → `"fulfilled"` / `"cancelled"` |
| `priority`          | string    | Yes      | `"emergency"` (default), `"urgent"`, or `"routine"`                      |
| `notes`             | string    | Optional | Additional notes                                                         |
| `updatedAt`         | timestamp | Optional | Last status update time                                                  |
| `updatedBy`         | string    | Optional | UID of admin who last updated                                            |

**Status Workflow:**

```
pending → approved → ordered → fulfilled
       ↘ cancelled (from any non-terminal status)
```

**Example:**

```json
{
  "medicineId": "med456",
  "medicineName": "Amoxicillin 500mg",
  "requestedQuantity": 200,
  "currentStock": 5,
  "minThreshold": 50,
  "reason": "Critical shortage — 3 patients awaiting treatment",
  "requestedBy": "uid_staff_001",
  "requestedByEmail": "nurse@ehafoclinic.com",
  "requestedAt": "2024-01-20T09:00:00Z",
  "status": "pending",
  "priority": "emergency",
  "notes": ""
}
```

---

### `operationalMetricsSnapshots`

Daily snapshots of pharmacy operating metrics. One document per calendar day.

Document ID: `YYYY-MM-DD` (e.g., `2024-01-20`)

| Field                   | Type      | Description                                       |
| ----------------------- | --------- | ------------------------------------------------- |
| `date`                  | string    | `YYYY-MM-DD` date key                             |
| `total`                 | number    | Total non-deleted medicines                       |
| `goodStanding`          | number    | Count in good standing                            |
| `lowStock`              | number    | Count below min threshold                         |
| `expired`               | number    | Count with past expiry date                       |
| `expiringSoon`          | number    | Count expiring within 90 days                     |
| `outOfStock`            | number    | Count with quantity = 0                           |
| `adequate`              | number    | Count at or above 1.5× min threshold              |
| `goodStandingPct`       | number    | Percentage in good standing                       |
| `lowStockPct`           | number    | Percentage low stock                              |
| `expiredPct`            | number    | Percentage expired                                |
| `expiringSoonPct`       | number    | Percentage expiring soon                          |
| `outOfStockPct`         | number    | Percentage out of stock                           |
| `stockAvailPct`         | number    | Percentage available (100 − outOfStock − expired) |
| `overallOperatingScore` | number    | Weighted score 0–100 (formula below)              |
| `savedAt`               | timestamp | When snapshot was saved                           |

**Score Formula:**

```
score = (goodStandingPct × 0.45) + (stockAvailPct × 0.30) − (expiredPct × 0.15) − (lowStockPct × 0.10)
```

Clamped to 0–100. Grades: Excellent ≥85 / Good ≥70 / Fair ≥50 / At Risk ≥30 / Critical <30.
