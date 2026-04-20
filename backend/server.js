// backend/server.js
// Main Express server entry point

require('dotenv').config(); // Load .env variables
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { connectDB } = require('./config/db');

// Import route modules
const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const hrRoutes = require('./routes/hrRoutes');
const managerRoutes = require('./routes/managerRoutes');
const interviewerRoutes = require('./routes/interviewerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const publicRoutes = require('./routes/publicRoutes');
const applicantRoutes = require('./routes/applicantRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from project root
app.use(express.static(path.join(__dirname, '..')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/interviewer', interviewerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/applicant', applicantRoutes);

// --- Root redirect to login page ---
app.get('/', (req, res) => {
  res.redirect('/frontend/pages/login.html');
});

// --- Error handling middleware ---
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// --- Start Server ---
async function startServer() {
  try {
    // Connect to persistent MongoDB (data stored on disk in ./data/db)
    console.log('[Server] Connecting to MongoDB Atlas...');
    await connectDB();

    // Seed only if DB is empty (first run)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Server] Seeding database (dev only)...');
      const { seedDatabase } = require('./seed');
      await seedDatabase();
    }

    // Start listening
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(' HR Operations Manager');
      console.log(`  Server running at http://localhost:${PORT}`);
      console.log(`  Login page: http://localhost:${PORT}/frontend/pages/index.html`);
      console.log('  Data: PERSISTENT (survives restarts)');
      console.log('========================================');
      console.log('');
      console.log(' Test Credentials (all passwords: password123):');
      console.log('  Super Admin:        admin');
      console.log('========================================');
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

startServer();
