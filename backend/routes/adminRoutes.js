// backend/routes/adminRoutes.js
// Admin dashboard routes

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { 
  getStats, 
  getReports, 
  exportData, 
  getCompanies, 
  createCompany, 
  createCompanyHR, 
  deleteUser,
  getCompanyPasswordRequests,
  approveCompanyPasswordRequest,
  rejectCompanyPasswordRequest
} = require('../controllers/adminController');

// All routes require Admin role
router.use(verifyToken, requireRole('Admin'));

router.get('/stats', getStats);
router.get('/reports', getReports);
router.get('/export', exportData);

router.get('/companies', getCompanies);
router.post('/companies', createCompany);
router.post('/companies/:id/hr', createCompanyHR);
router.delete('/users/:id', deleteUser);

// Password requests routes
router.get('/password-requests', getCompanyPasswordRequests);
router.put('/password-requests/:id/approve', approveCompanyPasswordRequest);
router.put('/password-requests/:id/reject', rejectCompanyPasswordRequest);

module.exports = router;
