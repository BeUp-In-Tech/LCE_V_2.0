# Laundry Care Express — Standalone Admin Portal (`Lce_Admin`)

This is the **Standalone Admin & Database Management Application** for Laundry Care Express.

It is built as an independent React 19 + TypeScript application designed to run on a separate domain or subdomain (e.g., `https://admin.laundrycareexpress.com`).

---

## Key Features

1. **Dedicated Admin Authentication**: Secure login via Email & Password, strictly requiring `is_admin = 1` in `lce_user_info`.
2. **System Overview & Metrics**: Real-time counters for Total Users, Total Pickups, Scheduled Pickups, Active Subscriptions, and Revenue.
3. **Pickups & Orders Manager**: Quick order status dropdown updater (Scheduled, Out for Pickup, Delivered, Cancelled).
4. **Users Manager**: User profile inspection, credit management, user editing, and Admin status toggle (`is_admin = 1`).
5. **Database Inspector & Relation Editor**:
   - Inspect **ALL** `lce_*` database tables (`lce_user_info`, `lce_user_pickup`, `lce_prices`, `lce_subscriptions`, `lce_promocodes`, `lce_gift_cards`, etc.).
   - Full CRUD: Insert new rows, edit column values, search/filter across fields.
   - Foreign key detection & relation options.
   - Safe deletion with **Force Cascade Delete** support for records with foreign key dependencies.

---

## Local Development Setup

```bash
# Navigate to the Lce_Admin directory
cd Lce_Admin

# Install dependencies
npm install

# Run dev server (runs on port 5174)
npm run dev
```

---

## Environment Configuration

Create a `.env` file in `Lce_Admin` root:

```env
VITE_API_URL=http://localhost:8000/api
```

For production/staging deployment:
```env
VITE_API_URL=https://api.laundrycareexpress.com/api
```

---

## Subdomain Deployment (Nginx / VPS)

To deploy `Lce_Admin` on `admin.laundrycareexpress.com`:

```bash
# Build the production bundle
npm run build
```

This creates a `dist/` directory containing static assets. Point Nginx to serve `Lce_Admin/dist` on `admin.laundrycareexpress.com`.
