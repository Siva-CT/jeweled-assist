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

### 2. Frontend (Client)
```bash
cd client
npm install
npm run dev
```
*Launches Dashboard at http://localhost:5173*

## ☁️ Deployment (Render.com)

1. **New Web Service** -> Connect Repo
2. **Root Directory**: `server`
3. **Build Command**: `npm install`
4. **Start Command**: `node index.js`

5. **New Static Site** -> Connect Repo
6. **Root Directory**: `client`
7. **Build Command**: `npm run build`
8. **Publish Directory**: `dist`
