// backend/routes/interviewerRoutes.js
// Interviewer dashboard routes

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getMyInterviews, submitResult } = require('../controllers/interviewerController');

// All routes require Interviewer role
router.use(verifyToken, requireRole('Interviewer'));

router.get('/interviews', getMyInterviews);
router.put('/:id/submit-result', submitResult);

module.exports = router;
