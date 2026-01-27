# 💎 JeweledAssist

**B2B/B2C Jewelry Management System powered by AI Agents & Twilio WhatsApp**

## 📂 Project Structure

- **`/client`**: Frontend Dashboard (React + Vite).
- **`/server`**: Backend API & WhatsApp Bot (Node.js + Express).

## 🚀 Setup Instructions

### 1. Backend (Server)
```bash
cd server
npm install
npm start
```
*Creates the API at http://localhost:3000*

### 3. Environment Variables (Required)
Create a `.env` file in `server/` (or set in Render Dashboard):

```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_twilio_number
FRONTEND_URL=https://your-frontend.onrender.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...} 
# (Paste the full JSON content of your firebase-admin-key.json in one line)
```

## ☁️ Deployment (Render.com)

1. **New Web Service** -> Connect Repo
2. **Root Directory**: `server`
3. **Build Command**: `npm install`
4. **Start Command**: `node index.js`

5. **New Static Site** -> Connect Repo
6. **Root Directory**: `client`
7. **Build Command**: `npm run build`
8. **Publish Directory**: `dist`
