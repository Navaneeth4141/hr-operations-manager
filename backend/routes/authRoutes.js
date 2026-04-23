// backend/routes/authRoutes.js
// Authentication routes

const express = require('express');
const router = express.Router();
const { login, register, getUsers, forgotPasswordApplicant, forgotPasswordCompany, forgotPasswordMember } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password/applicant', forgotPasswordApplicant);
router.post('/forgot-password/company', forgotPasswordCompany);
router.post('/forgot-password/member', forgotPasswordMember);

// Protected route - get users list (for dropdowns)
router.get('/users', verifyToken, getUsers);

module.exports = router;
