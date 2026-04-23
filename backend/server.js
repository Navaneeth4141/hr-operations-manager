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

// Helper: resolve a page filename to its absolute path
const PAGES_DIR = path.join(__dirname, '..', 'frontend', 'pages');
const page = (filename) => path.join(PAGES_DIR, filename);

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve ALL static files (CSS, JS, images, uploads, etc.) from project root
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

// ============================================================
// CLEAN URL ROUTES
// Maps short clean paths → actual HTML files in frontend/pages/
// e.g. GET /admin-dashboard  →  serves admin_dashboard.html
// ============================================================
const cleanRoutes = {
  '/':                         'index.html',
  '/home':                     'index.html',
  '/login':                    'login.html',
  '/admin-dashboard':          'admin_dashboard.html',
  '/hr-dashboard':             'hr_dashboard.html',
  '/applicant-dashboard':      'applicant_dashboard.html',
  '/applicant-profile':        'applicant_profile.html',
  '/apply':                    'apply.html',
  '/team-management':          'team_management.html',
  '/interviewer-dashboard':    'interviewer_dashboard.html',
  '/manager-dashboard':        'manager_dashboard.html',
};

Object.entries(cleanRoutes).forEach(([cleanPath, filename]) => {
  app.get(cleanPath, (req, res) => {
    res.sendFile(page(filename));
  });
});

// ============================================================
// LEGACY REDIRECT RULES  (301 Permanent)
// Old /frontend/pages/*.html URLs redirect to their clean counterparts.
// Query strings (e.g. ?role=admin, ?job=OPP-101) are preserved.
// ============================================================
const legacyRedirects = {
  '/frontend/pages/index.html':                  '/',
  '/frontend/pages/login.html':                  '/login',
  '/frontend/pages/admin_dashboard.html':        '/admin-dashboard',
  '/frontend/pages/hr_dashboard.html':           '/hr-dashboard',
  '/frontend/pages/applicant_dashboard.html':    '/applicant-dashboard',
  '/frontend/pages/applicant_profile.html':      '/applicant-profile',
  '/frontend/pages/apply.html':                  '/apply',
  '/frontend/pages/team_management.html':        '/team-management',
  '/frontend/pages/interviewer_dashboard.html':  '/interviewer-dashboard',
  '/frontend/pages/manager_dashboard.html':      '/manager-dashboard',
};

Object.entries(legacyRedirects).forEach(([oldPath, newPath]) => {
  app.get(oldPath, (req, res) => {
    const qs = Object.keys(req.query).length
      ? '?' + new URLSearchParams(req.query).toString()
      : '';
    res.redirect(301, newPath + qs);
  });
});

// --- Global Error Handling ---
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// --- Start Server ---
async function startServer() {
  try {
    console.log('[Server] Connecting to database...');
    await connectDB();

    // Seed only in development (not on Render/production)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Server] Seeding database (dev only)...');
      const { seedDatabase } = require('./seed');
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log('========================================');
      console.log(' HR Operations Manager');
      console.log(`  Server : http://localhost:${PORT}`);
      console.log(`  Home   : http://localhost:${PORT}/`);
      console.log('  Clean URLs : ACTIVE ✓');
      console.log('========================================');
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

startServer();
