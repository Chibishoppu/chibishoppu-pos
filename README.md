# Chibishoppu POS - ACG Booth Point of Sale

An offline-first POS & inventory system designed for ACG (Anime/Comic/Games) convention booth sales. Built with React + Vite, using Dexie.js (IndexedDB) for local storage. Installable as a PWA (Windows) or via Capacitor (Android tablet).

## Features

- **POS Register** — product grid, cart, checkout (cash / QR / card / split payment)
- **Inventory Management** — add/edit/delete products, batch restock, low-stock alerts
- **Daily Sales Reports** — hourly sales chart, payment breakdown, category analytics, refund/void, per-event filtering
- **Z-Report Printing** — end-of-day / end-of-event cash drawer reconciliation
- **Booth Settings** — event config, currency (RM/MYR), tax, sound effects
- **Close Event** — auto-downloads a full JSON backup, archives the event's sales, and starts a fresh sales session
- **Backup & Restore** — versioned local JSON export/import of the whole POS database (products, photos, sales, settings)
- **Offline-first** — all data stored locally via IndexedDB (Dexie.js), no internet required after install
- **Currency: RM (Malaysian Ringgit)** by default

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **UI:** MUI Material + Tailwind CSS
- **Database:** Dexie.js (IndexedDB) — works in browser & Android WebView
- **PWA:** vite-plugin-pwa (service worker for offline install on Windows)
- **Mobile:** Capacitor 6 (Android .apk build)

## Prerequisites

- Node.js 18+ 
- For Android builds: Android Studio + JDK 17

## Run Locally (Development)

1. Install dependencies:
   ```
   npm install
   ```
2. Start the dev server:
   ```
   npm run dev
   ```
3. Open http://localhost:3000 in your browser

The app will seed itself with demo products and sample transactions on first run.

## Install as PWA (Windows)

1. Run `npm run build`
2. Serve the `dist/` folder (e.g. `npm run preview` or any static server)
3. Open the URL in Chrome/Edge
4. Click the "Install" button in the address bar
5. The app installs as a desktop app with its own icon — works offline after first install

## Build Android APK (for tablet)

1. Build the web assets:
   ```
   npm run build
   ```
2. Sync to Android:
   ```
   npm run cap:sync
   ```
3. Open in Android Studio to build the APK:
   ```
   npm run android:open
   ```
   Then in Android Studio: Build → Build Bundle(s)/APK(s) → Build APK(s)

4. Or build from command line:
   ```
   npm run android:build
   ```

The resulting `.apk` can be sideloaded onto an Android tablet (no Play Store needed).

## Database

Data is stored in IndexedDB via Dexie.js. The database file is named `ChibishoppuPOS` and can be found in:
- **Windows (browser/PWA):** Browser's IndexedDB storage (per-origin)
- **Android (Capacitor):** App's WebView IndexedDB storage

### Event Sessions
Transactions are stamped with an `eventId` (Dexie schema v3). The "Close Event" button in Settings downloads a JSON backup, then regenerates the session so new sales are grouped under the next event — past sales remain viewable via the event filter in Sales Report.

### Reset Data
Use the "Clear All Data" button in Settings to wipe products, transactions and cart (booth settings are kept), or restore a JSON backup via the Backup & Restore card.

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Build production web assets to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | TypeScript type check (no emit) |
| `npm run cap:sync` | Build + sync web assets to Android project |
| `npm run android:open` | Sync + open Android Studio |
| `npm run android:build` | Sync + build Android APK |

## Project Structure

```
src/
  components/       React UI components
    pos/            POS register, cart, checkout, receipt
    inventory/      Product management, restock
    reports/        Daily reports, Z-report
    settings/       Booth/event settings
    common/         Shared components (ChibiMascot)
  services/
    database.ts     Dexie.js schema + seeding logic
    db.ts           Data service layer (CRUD operations)
  data/
    initialData.ts  Default products + event config
    sampleTransactions.ts  Demo sales data
  types.ts          TypeScript interfaces
  utils/
    export.ts       CSV export + currency formatting
    audio.ts        Sound effects
  App.tsx           Main app component
  main.tsx          React entry point
capacitor.config.ts  Capacitor (Android) configuration
vite.config.ts       Vite + PWA configuration
```

## Currency

Default currency is **RM (MYR - Malaysian Ringgit)**. Changeable in Booth Setup settings.
