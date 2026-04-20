// backend/routes/authRoutes.js
// Authentication routes

const express = require('express');
const router = express.Router();
const { login, register, getUsers } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected route - get users list (for dropdowns)
router.get('/users', verifyToken, getUsers);

module.exports = router;
