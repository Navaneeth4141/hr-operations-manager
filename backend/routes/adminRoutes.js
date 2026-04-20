// backend/routes/adminRoutes.js
// Admin dashboard routes

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getStats, getReports, exportData, getCompanies, createCompany, createCompanyHR, deleteUser } = require('../controllers/adminController');

// All routes require Admin role
router.use(verifyToken, requireRole('Admin'));

router.get('/stats', getStats);
router.get('/reports', getReports);
router.get('/export', exportData);

router.get('/companies', getCompanies);
router.post('/companies', createCompany);
router.post('/companies/:id/hr', createCompanyHR);
router.delete('/users/:id', deleteUser);

module.exports = router;
