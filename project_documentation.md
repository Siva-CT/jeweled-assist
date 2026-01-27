# Jewel Assistant V2 - Project Documentation

## 1. Project Overview
**Jewel Assistant V2** is a specialized, memory-optimized WhatsApp sales bot designed for jewelry stores. It handles inquiries, estimates, exchanges, and sales handover, all while providing a rich "Luxury" dashboard for the store owner.

## 2. Key Features Implemented

### A. Core Chat Capabilities (WhatsApp Bot)
*   **Buying Flow**:
    *   Supports **Gold (22K, 24K, 18K)**, **Silver**, and **Platinum**.
    *   Provides instant price estimates based on live market rates (with fallback).
    *   Calculates **3% GST** and **Making Charges (15%)** automatically.
*   **Exchange Flow**:
    *   Professional acknowledgement and redirection to customer care.
*   **Sales Handover**:
    *   "Sales Mode" allows a human agent to take over control.
    *   "Bot Resumed" message when switching back.
*   **Auto-Cleanup & Inactivity**:
    *   **15-minute inactivity timer** sends a "Happy that you reached us" greeting + Map Location.
    *   **Aggressive Memory Cleanup**: Instantly deletes chat history after the session ends to prevent memory crashes.

### B. Owner Dashboard
*   **Luxury Theme**: Charcoal, White Smoke, and Gold color palette.
*   **3-Pane Layout**:
    *   **Left**: Navigation & Pending Inquiries.
    *   **Center**: Live Chat & Approval Interface.
    *   **Right**: Client Context & Notes.
*   **Executive Board**:
    *   Displays **Live Gold/Silver Rates**.
    *   Shows **Total Inquiries** (lifetime, persistent count).
    *   Displays "Recent Activity" feed.
*   **Settings**:
    *   Configure Store Location, Owner Number, and Manual Rate Overrides.

### C. Backend Stability & Intelligence
*   **Pricing Engine**:
    *   Fetches live rates via a Python script (`yfinance`).
    *   **Failsafe Timeout**: If rates take >3s, instant fallback to cached/safe defaults. No more "hanging" bot.
*   **Persistence**:
    *   All data saved to `server/data/store.json`.
    *   **Auto-Backups**: Writes to separate backup file first to prevent corruption.
    *   **Decoupled Stats**: "Total Queries" and "Customer Lists" are stored separately from chat history, so they survive memory pruning.

## 3. Technology Stack & Why Used

| Technology | Purpose | Reason for Choice |
| :--- | :--- | :--- |
| **Node.js + Express** | Backend Server | Fast, lightweight, and perfect for handling real-time chat webhooks. |
| **React + Vite** | Frontend Dashboard | Modern, fast build times, and excellent component modularity for the complex 3-pane layout. |
| **Tailwind CSS** | Styling | Rapid UI development with custom "luxury" theme variables (`--gold-primary`, etc.). |
| **Python (Script)** | Rate Fetching | `yfinance` library in Python is the most reliable free source for market rates. |
| **File-System DB (`fs`)** | Database | Simple, zero-config persistence (`store.json`). Perfect for small-setup deployments without needing a heavy MongoDB/Postgres instance. |

## 4. Known optimizations
*   **Memory Pruning**: To stay within the free tier (512MB RAM), the system deletes chat text after 15 mins of inactivity.
*   **Rate Caching**: Live rates are cached for 60 seconds to avoid spamming the API.

## 5. Deployment Notes
*   **Environment Variables**: Requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, etc.
*   **Health Check**: Root endpoint returns "OK" for load balancers.
