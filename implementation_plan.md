# Firebase Migration Plan

## Goal
Migrate the B2B Shop-Owner database from local memory (`db.js` JSON) to **Google Cloud Firestore**.
This moves the application from "Stateful" (High RAM) to "Stateless" (Low RAM), fulfilling the <512MB requirement.

## 1. Environment Setup [Done]
*   **Dependency**: Install `firebase-admin`.
*   **Credentials**: Use `GOOGLE_APPLICATION_CREDENTIALS` or environment variables for Render.

## 2. New Modules (To Be Created)
### A. Connection Layer (`server/firebase.js`)
*   Initializes the Firebase Admin SDK.
*   Handles "Service Account" detection (File vs Environment Variable).

### B. Service Layer (Sample CRUD)
*   **Approvals Service**: `server/services/approvalService.js`
    *   `createApproval()`
    *   `getPending()`
    *   `approveRequest()`

### C. Security Rules (`firestore.rules`)
*   Lock down database to server-only (Admin SDK) for backend.
*   Allow specific read-only access if we ever extend to client-side SDK.

## 3. Migration Strategy (Phased)
Since the current app is Synchronous (In-Memory Array), and Firestore is Asynchronous (Promise-based), we cannot just "swap" the file.

### Phase 1: Infrastructure (Current Task)
*   Set up the `firebase` connection module.
*   Create the `approvalService` to demonstrate the pattern.
*   Provide a `migrate_data.js` script to upload your specific `store.json` data to Firestore.
*   **Deliverable**: The modules requested by the user.

### Phase 2: Refactoring (Next Steps)
*   Refactor `whatsapp.js` to use `async/await` for all DB calls.
*   Replace `db.messages.push` with `approvalService.addMessage()`.

## 4. Firestore Schema Design

| Collection   | Document ID | Fields |
| :--- | :--- | :--- |
| `settings`   | `config`    | `storeLocation`, `manualRates`, `ownerNumber` |
| `stats`      | `main`      | `totalQueries`, `revenue` |
| `approvals`  | `UUID`     | `customer`, `weight`, `estimatedCost`, `status` |
| `customers`  | `Phone`     | `lastSeen`, `tier`, `totalSpent` |
| `messages`   | `Auto-ID`   | `from`, `to`, `text`, `timestamp` (Indexed) |
