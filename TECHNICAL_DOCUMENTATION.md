# Jeweled Assist - Technical Documentation

## 1. Project Overview
**Jeweled Assist** is a specialized B2B WhatsApp Sales Assistant designed for Luxury Jewelry Retailers.
**Visual Identity**: Dark Premium Theme (Navy/Black/Gold) to reflect luxury.

### The B2B Problem
Small and medium jewelry business owners struggle with:
*   **24/7 Availability**: Missing leads outside store hours.
*   **Lead Qualification**: Spending time on "window shoppers" vs. serious buyers.
*   **Pricing Complexity**: Gold rates fluctuate daily; manual calculation for every inquiry is tedious.
*   **Professionalism**: Inconsistent messaging style across different staff members.

### The Solution
A hybrid AI-Bot system that:
1.  **Automates** initial interactions (Greeting, Catalog, approximate pricing).
2.  **Qualifies** intent (Buy, Exchange, Valuation).
3.  **Escalates** high-value or complex queries to the "Shop Owner" (Human Agent) via a dedicated Dashboard.
4.  **Syncs** with Live Gold Rates for accurate estimates.

---

## 2. Tech Stack

### Frontend (Owner Dashboard)
*   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) (Fast, modern build tool).
*   **Styling**: [TailwindCSS](https://tailwindcss.com/) (Utility-first for rapid UI) + Custom CSS Variables for Theming.
*   **Icons**: `lucide-react`.
*   **HTTP Client**: Native `fetch` API.

### Backend (Bot Brain)
*   **Runtime**: [Node.js](https://nodejs.org/) (Event-driven, non-blocking).
*   **Server**: [Express.js](https://expressjs.com/) (Webhook handling).
*   **Database**: [Google Firestore](https://firebase.google.com/docs/firestore) (NoSQL, real-time sync).
*   **WhatsApp Integration**: [Twilio API](https://www.twilio.com/) (Sandbox/Production messaging).
*   **Live Rates**: [GoldAPI.io](https://goldapi.io/) (External Fetch).

### Data persistence
*   **Sessions**: In-memory caching (`Map`) with Firestore backup.
*   **Chats**: Stored in `messages` collection.
*   **Customers**: Stored in `customers` collection.

---

## 3. Architecture & Methods

### 3.1 Interaction Logic (State Machine)
The bot operates on a **Session-Based State Machine**:
1.  **Incoming Webhook**: Twilio POSTs a message to `/api/whatsapp`.
2.  **Session Lookup**: System checks `phone` in Memory/DB.
    *   *New User* -> Create Session -> State: `welcome`.
    *   *Existing User* -> Retrieve State (e.g., `rate_inquiry_weight`).
3.  **Processing**:
    *   Input is normalized (trimmed, lowercase).
    *   Logic router determines next step (e.g., "If step is `menu` and input is `1`, go to `buy_flow`").
4.  **Reply Generation**:
    *   Bot generates a response (Text/Media).
    *   **Reply-First Architecture**: Response is sent to Twilio *immediately* (< 2 secs).
    *   **Async Logging**: DB writes happen in the background to prevent timeouts.

### 3.2 Human Handoff (The "Hybrid" Model)
*   **Trigger**: User selects "Talk to Expert" OR specific high-value intents (Custom Design).
*   **Mechanism**:
    *   `bot_enabled` flag set to `false` for that phone number.
    *   Status updated to `requires_owner_action: true`.
    *   Appears in **InboxPage.jsx** on the Dashboard with a "Needs Action" badge.
*   **Resolution**: Owner replies via Dashboard -> Bot flag remains off until manually toggled back on.

### 3.3 Dashboard Architecture
*   **Polling vs. Sockets**: We utilized **Polling** (Interval Fetch) for the MVP to reduce complexity and cost, avoiding the need for a dedicated WebSocket server.
*   **Optimistic UI**: Buttons (like "Toggle Bot") update UI immediately before waiting for API confirmation to feel "snappy".

---

## 4. Challenges & Debugging Log

### 📉 Challenge 1: Firestore Quota Exceeded
*   **Issue**: The free tier of Firestore allows limited daily reads. Our initial implementation read the DB for *every* message step, causing thousands of reads rapidly.
*   **Resolution**:
    1.  Implemented **In-Memory Caching** (`sessionCache` Map) with a 60-second TTL.
    2.  Code first checks RAM; if present, it skips the DB read entirely.
    3.  Removed `onSnapshot` listeners which keep open connections and count as reads.

### 🐞 Challenge 2: Chat History Indexing Errors
*   **Issue**: The Inbox Chat failed to load with a "Firestore Index Required" error. This was caused by a complex query: `.where('from', '==', phone).orderBy('timestamp', 'desc')`. Firestore demands a composite index for inequalities+sorts on different fields.
*   **Resolution**:
    *   Simplified the backend query to **only** filter by `where('from', ...)` and `where('to', ...)`.
    *   Performed the **Sorting in RAM** (Javascript `.sort()`) after fetching the raw documents. This bypassed the strict indexing requirement.

### 🔄 Challenge 3: "Welcome Back" Loop
*   **Issue**: When the Owner toggled the bot *back on*, the bot would remember the user's *last* step (e.g., "enter_weight"). The user would say "Hi", and the bot would say "Please enter weight" instead of the Menu.
*   **Resolution**:
    *   Modified the `/toggle-bot` endpoint to **Hard Reset** the session state to `step: 'menu'` whenever the bot is reactivated.

### 🎨 Challenge 4: Mock Data cleanup
*   **Issue**: The Dashboard relied on "Mock Data" (Fake conversations) if the API returned an empty list, confusing the user during deployment.
*   **Resolution**:
    *   Removed the Fallback Arrays in `InboxPage.jsx`.
    *   Ensured the UI handles `[]` (empty array) gracefully by showing a "No active chats" state instead of fake ones.

---

## 5. Conversation Prompt History (Key Milestones)

A summary of the user prompts that guided this development:

1.  **"Build a WhatsApp Sales Assistant for my Jewelry Store"**
    *   *Result*: Initial setup of Node.js server, Twilio integration, and basic "Menu" flow.

2.  **"Create a Dashboard for the shop owner"**
    *   *Result*: Implementation of the React Admin UI, Sidebar, and Stats Overview.

3.  **"Fix the zero values in Gold Rate"**
    *   *Result*: Integration of `GoldAPI.io` and fixing the fetch URL typo in `ExecutiveDashboard.jsx`.

4.  **"I want to take over chats manually. Add a toggle."**
    *   *Result*: Creation of the **Bot/Agent Toggle** in the chat window and the `bot_enabled` logic in the backend.

5.  **"The Inbox shows random numbers. Fix this."**
    *   *Result*: Removal of mock data and connection of `InboxPage` to the real `/api/dashboard/inbox` endpoint.

6.  **"Chat history isn't showing up."**
    *   *Result*: Debugging the Firestore Query and fixing the "Index" error by sorting in memory.

7.  **"Remove the Activity Card and User Profile."**
    *   *Result*: Final UI polish to declutter the interface as per user preference.
