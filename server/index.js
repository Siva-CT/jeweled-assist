require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors((req, callback) => {
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:4173',
        process.env.FRONTEND_URL
    ];
    const origin = allowedOrigins.includes(req.header('origin'))
        ? req.header('origin')
        : allowedOrigins[0];
    callback(null, { origin, credentials: true });
}));

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

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    // Express v5 wildcard
    app.get('/*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
