// backend/routes/managerRoutes.js
// Manager dashboard routes

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { 
  getManagerApplications, 
  scheduleInterview, 
  makeFinalDecision 
} = require('../controllers/managerController');

// All routes require Manager role
router.use(verifyToken, requireRole('Manager'));

router.get('/applications', getManagerApplications);
router.put('/:id/schedule-interview', scheduleInterview);
router.put('/:id/final-decision', makeFinalDecision);

module.exports = router;
