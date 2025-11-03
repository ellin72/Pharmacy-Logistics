# 🏥 Pharmacy Logistics MVP Build Plan (Ehafo Clinic)

## 🎯 Core Objectives

- Track **medications** with expiry dates, batch numbers, and stock levels.  
- Allow **add/remove/adjust** operations when stock changes.  
- Generate **alerts** for:
  - Expiring soon (e.g., within 30 days).  
  - Low stock (below threshold).  
- Provide a **simple dashboard** for clinic staff.  
- Keep it **lightweight, offline-resilient**, and easy to maintain.

---

## 📌 Phase 1: Foundation (Week 1–2)

### 1. Requirements & Design

- **User roles**:  
  - Admin (pharmacist/clinic manager).  
  - Staff (can add/remove stock).  

- **Data model** (Firestore/Supabase):  
  - `medicines`: name, batch, expiryDate, quantity, minThreshold, status.  
  - `transactions`: medicineId, type (add/remove), quantity, reason, timestamp.  
  - `alerts`: medicineId, type (expiry_soon/low_stock), dueOn, resolved.  

- **UI mockups**:  
  - Login screen.  
  - Dashboard (inventory table + alerts).  
  - Add medicine form.  
  - Remove/adjust stock form.

### 2. Repo Setup

- GitHub repo with structure:
  ```
  frontend/
  backend/ (optional for later)
  database/
  docs/
  tests/
  ```
- Add README with setup instructions.

---

## 📌 Phase 2: Core Features (Week 3–4)

### 1. Authentication

- Email/password login (Firebase Auth or Supabase Auth).  
- Protect all inventory actions behind login.

### 2. Inventory Management

- **Add medicine** form → saves to `medicines`.  
- **Adjust/remove stock** → updates quantity, logs in `transactions`.  
- **Auto-status update**: expired, low stock, in stock.

### 3. Dashboard

- Table view of all medicines.  
- Filters: expired, expiring soon, low stock.  
- Alerts panel (expiry + low stock).

---

## 📌 Phase 3: Automation & Alerts (Week 5–6)

### 1. Automated Checks

- Cloud Function (Firebase) or Edge Function (Supabase) runs daily:  
  - Marks expired items.  
  - Creates alerts for low stock or expiring soon.

### 2. Notifications

- Start simple: alerts visible in dashboard.  
- Later: email/SMS/WhatsApp notifications for critical alerts.

---

## 📌 Phase 4: Deployment & Testing (Week 7)

- **Frontend**: Deploy to Firebase Hosting, Netlify, or Vercel.  
- **Backend/DB**: Firebase Firestore or Supabase Postgres.  
- **Testing**:  
  - Add/remove medicine.  
  - Simulate expiry.  
  - Trigger low stock alerts.  
- **Pilot at Ehafo Clinic**:  
  - Train 1–2 staff to use it.  
  - Collect feedback.

---

## 📌 Phase 5: Feedback & Iteration (Week 8+)

- Gather feedback from clinic staff.  
- Prioritize improvements:  
  - Barcode/QR scanning for faster entry.  
  - Export reports (CSV/PDF).  
  - Multi-user roles (nurses vs pharmacists).  
  - Offline-first (PWA with local cache).  

---

## 🛠️ Tech Stack Recommendation

- **Frontend**: Plain HTML/JS (MVP) → upgrade to React/Vue later.  
- **Backend/DB**: Firebase (Firestore + Auth + Hosting) for speed.  
- **Optional**: Supabase if SQL is preferred.  
- **Deployment**: GitHub repo → auto-deploy to Firebase Hosting.  

---

## 📊 Timeline Overview

| Week | Milestone |
|------|------------|
| 1–2  | Requirements, repo setup, data model, mockups |
| 3–4  | Auth + Inventory CRUD + Dashboard |
| 5–6  | Automation (expiry/low stock alerts) |
| 7    | Deployment + Testing at Ehafo Clinic |
| 8+   | Feedback, iteration, advanced features |

---

## 🚀 MVP Success Criteria

- Clinic staff can **log in** securely.  
- Medicines can be **added, updated, and removed**.  
- System shows **expiry and low stock alerts**.  
- Runs reliably on **basic devices with internet**.  
- Deployed and usable at **Ehafo Clinic** within 2 months.  

---

👉 This plan gets you a **working, clinic-ready MVP in ~8 weeks**. After that, you can expand into reporting, QR codes, or even integration with national health systems.

