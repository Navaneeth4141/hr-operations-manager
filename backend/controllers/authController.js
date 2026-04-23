// backend/controllers/authController.js
// Handles user login and registration

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');
const PasswordResetRequest = require('../models/PasswordResetRequest');
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

/**
 * POST /api/auth/forgot-password/applicant
 * Direct password reset for applicants
 */
async function forgotPasswordApplicant(req, res) {
  try {
    const { username, email, newPassword } = req.body;
    if (!username || !email || !newPassword) {
      return res.status(400).json({ error: 'Username, email, and new password are required.' });
    }

    const user = await User.findOne({ username, email, role: 'Applicant' });
    if (!user) {
      return res.status(404).json({ error: 'Applicant account not found.' });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.json({ message: 'Password updated successfully. You can now login.' });
  } catch (err) {
    console.error('[Auth] Applicant forgot password error:', err);
    res.status(500).json({ error: 'Server error processing request.' });
  }
}

/**
 * POST /api/auth/forgot-password/company
 * Creates pending request for Company HR
 */
async function forgotPasswordCompany(req, res) {
  try {
    const { companyName, username, email, newPassword } = req.body;
    if (!companyName || !username || !email || !newPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const company = await Company.findOne({ name: companyName });
    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    const user = await User.findOne({ username, email, role: 'CompanyHR', companyId: company._id });
    if (!user) {
      return res.status(404).json({ error: 'HR account not found for this company.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const existingRequest = await PasswordResetRequest.findOne({ user: user._id, status: 'Pending' });
    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending password reset request.' });
    }

    await new PasswordResetRequest({
      user: user._id,
      company: company._id,
      newPasswordHash
    }).save();

    res.json({ message: 'Password reset request submitted. Please wait for Admin approval.' });
  } catch (err) {
    console.error('[Auth] Company forgot password error:', err);
    res.status(500).json({ error: 'Server error processing request.' });
  }
}

/**
 * POST /api/auth/forgot-password/member
 * Creates pending request for Team Member (Interviewer/Manager)
 */
async function forgotPasswordMember(req, res) {
  try {
    const { username, email, newPassword } = req.body;
    if (!username || !email || !newPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const user = await User.findOne({ username, email, role: { $in: ['Manager', 'Interviewer'] } });
    if (!user) {
      return res.status(404).json({ error: 'Team member account not found.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const existingRequest = await PasswordResetRequest.findOne({ user: user._id, status: 'Pending' });
    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending password reset request.' });
    }

    await new PasswordResetRequest({
      user: user._id,
      company: user.companyId,
      newPasswordHash
    }).save();

    res.json({ message: 'Password reset request submitted. Please wait for your HR to approve it.' });
  } catch (err) {
    console.error('[Auth] Member forgot password error:', err);
    res.status(500).json({ error: 'Server error processing request.' });
  }
}

module.exports = { login, register, getUsers, forgotPasswordApplicant, forgotPasswordCompany, forgotPasswordMember };
