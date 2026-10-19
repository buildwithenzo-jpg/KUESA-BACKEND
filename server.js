require('dotenv').config();
if (process.env.USE_GOOGLE_DNS === 'true') require('dns').setServers(['8.8.8.8','1.1.1.1']);
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files (e.g. M-Pesa screenshots) statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'KUESA API is running' });
});

// Routes
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/registrations', require('./routes/registrationRoutes'));
app.use('/api/news', require('./routes/newsRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/partners', require('./routes/partnerRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
