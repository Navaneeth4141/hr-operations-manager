// backend/routes/applicationRoutes.js
// Application submission and applicant routes

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, requireRole } = require('../middleware/auth');
const { 
  submitApplication, 
  getMyApplications, 
  respondToOffer, 
  getOpportunities 
} = require('../controllers/applicationController');

// Configure multer for resume file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function(req, file, cb) {
    // Prefix with timestamp to avoid name collisions
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    // Allow common document formats
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

// Public routes
router.get('/opportunities', getOpportunities);

// Protected routes (Applicant only)
router.post('/apply', verifyToken, requireRole('Applicant'), upload.single('resume'), submitApplication);

// Protected routes (Applicant only)
router.get('/my', verifyToken, requireRole('Applicant'), getMyApplications);
router.put('/:id/respond', verifyToken, requireRole('Applicant'), respondToOffer);

module.exports = router;
