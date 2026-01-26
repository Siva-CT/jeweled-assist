# 💎 JeweledAssist

**B2B/B2C Jewelry Management System powered by AI Agents & Twilio WhatsApp**

JeweledAssist is a hybrid Intelligence system designed for jewelry owners to manage inquiries, automate pricing estimates, and retain personal touch with customers via WhatsApp.

## 🚀 Architecture

- **Frontend**: React + Vite (Dashboard for Owner)
- **Backend**: Node.js + Express (API & Webhooks)
- **Pricing Engine**: Python + yfinance (Real-time Gold/Silver Rates)
- **Communication**: Twilio API (WhatsApp Integration)
- **Database**: JSON-based (Lightweight, file-system persistence)

## ✨ key Features

### 1. Unified Approval Queue
- **Problem**: Owners get overwhelmed with WhatsApp pricing requests.
- **Solution**: The bot handles basic queries. High-value estimates (> ₹20k) are added to a "Pending Approvals" queue on the Dashboard.
- **Owner Action**: Click "Approve" to send a formal quote, or "Nudge" to follow up.

### 2. Hybrid Owner Control
- **Dashboard**: Full visual control of chats and requests.
- **WhatsApp**: Owner can send commands like `Approve 15000` or `Set Threshold 50000` directly to the bot to control the system on the go.

### 3. Smart Pricing
- **Live Rates**: Python script fetches real-time Gold/Silver rates from Yahoo Finance.
- **Manual Override**: Owner can set fixed rates (e.g., ₹7800/g) to override the API during volatility.

## 🛠️ Local Setup

1.  **Clone Request**:
    ```bash
    git clone https://github.com/your-username/jeweled-assist.git
    cd jeweled-assist
    ```

2.  **Backend Setup**:
    ```bash
    cd server
    npm install
    # Install Python dependencies
    pip install -r requirements.txt
    
    # Configure Env
    cp .env.example .env
    # Edit .env with your Twilio Credentials
    
    npm start
    ```

3.  **Frontend Setup**:
    ```bash
    cd client
    npm install
    npm run dev
    ```

## ☁️ Render Deployment

### Backend (Web Service)
1.  Connect GitHub repo to Render.
2.  Root Directory: `server`
3.  Build Command: `npm install && pip install -r requirements.txt`
4.  Start Command: `node index.js`
5.  **Environment Variables**: Add `TWILIO_...` keys and `FRONTEND_URL`.

### Frontend (Static Site)
1.  Connect GitHub repo.
2.  Root Directory: `client`
3.  Build Command: `npm run build`
4.  Publish Directory: `dist`
5.  **Environment Variables**: Add `VITE_API_URL` (URL of your deployed backend).
