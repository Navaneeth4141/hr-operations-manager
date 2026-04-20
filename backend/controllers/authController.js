// backend/controllers/authController.js
// Handles user login and registration

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Generate JWT token with user info
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role,
        email: user.email,
        department: user.department,
        companyId: user.companyId
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Return token and user details for frontend
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        companyId: user.companyId
      }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
}

/**
 * POST /api/auth/register
 * Register new user (open for Applicants, admin-only for other roles)
 */
async function register(req, res) {
  try {
    const { username, password, email, role } = req.body;

    // Validate required fields
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required.' });
    }

    // Only allow Applicant role for public registration
    const userRole = role || 'Applicant';
    if (userRole !== 'Applicant' && (!req.user || req.user.role !== 'Admin')) {
      return res.status(403).json({ error: 'Only admins can create non-applicant users.' });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    // Create new user
    const user = new User({ username, password, email, role: userRole });
    await user.save();

    res.status(201).json({ 
      message: 'Registration successful. You can now login.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('[Auth] Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
}

/**
 * GET /api/auth/users
 * Get all users (for dropdowns - HR, Manager, Interviewer lists)
 */
async function getUsers(req, res) {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

module.exports = { login, register, getUsers };
