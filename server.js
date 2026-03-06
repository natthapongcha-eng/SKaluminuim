const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '/'))); // Serve frontend files

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Import Routes
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const projectRoutes = require('./routes/projects');
const customerRoutes = require('./routes/customers');
const quotationRoutes = require('./routes/quotations');
const attendanceRoutes = require('./routes/attendance');
const reportRoutes = require('./routes/reports');
const mediaRoutes = require('./routes/media');
const announcementRoutes = require('./routes/announcement');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/announcement', announcementRoutes);

// Handle invalid JSON payloads for API requests
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({ success: false, message: 'ไฟล์รูปมีขนาดใหญ่เกินไป (สูงสุด 10MB)' });
    }

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
    }
    next(err);
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define Basic Route
app.get('/api/status', (req, res) => {
    res.json({ status: 'Backend is running', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// API 404 fallback should return JSON (not HTML)
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT}/index.html to view the app`);
});

// Root route redirects to index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
