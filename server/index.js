require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors((req, callback) => { // Dynamic CORS to allow Render frontend
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:4173',
        process.env.FRONTEND_URL || 'https://your-app.onrender.com'
    ];
    const origin = allowedOrigins.includes(req.header('origin'))
        ? req.header('origin')
        : allowedOrigins[0];
    callback(null, { origin, credentials: true });
}));

// Test Bridge Route
const { calculatePrice } = require('./utils/pricingEngine');
app.get('/test-price', async (req, res) => {
    try {
        const result = await calculatePrice(10); // 10g test
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Routes
const whatsappRoutes = require('./routes/whatsapp');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Root Route (for better UX)
app.get('/', (req, res) => {
    res.send('💎 Jewelry Assistant Backend is Running! Use /api/whatsapp for webhooks.');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    // Serve frontend in production
    if (process.env.NODE_ENV === 'production') {
        const path = require('path');
        app.use(express.static(path.join(__dirname, '../client/dist')));
        app.get('/*', (req, res) => {
            res.sendFile(path.join(__dirname, '../client/dist/index.html'));
        });
    }
}
