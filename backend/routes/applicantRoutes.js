// backend/routes/applicantRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ApplicantProfile = require('../models/ApplicantProfile');

// GET /api/applicant/profile - get own profile
router.get('/profile', verifyToken, requireRole('Applicant'), async (req, res) => {
  try {
    const profile = await ApplicantProfile.findOne({ userId: req.user.userId });
    res.json(profile || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/applicant/profile - save/update own profile
router.put('/profile', verifyToken, requireRole('Applicant'), async (req, res) => {
  try {
    const data = req.body;
    const profile = await ApplicantProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { ...data, userId: req.user.userId },
      { upsert: true, new: true, runValidators: false }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// GET /api/applicant/profile/:userId - HR views an applicant's profile
router.get('/profile/:userId', verifyToken, requireRole(['CompanyHR', 'Manager', 'Interviewer']), async (req, res) => {
  try {
    const profile = await ApplicantProfile.findOne({ userId: req.params.userId }).populate('userId', 'username email');
    res.json(profile || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applicant profile' });
  }
});

module.exports = router;
