// backend/middleware/auth.js
// JWT authentication and role-based authorization middleware

const jwt = require('jsonwebtoken');

// Secret key for JWT signing (in production, use environment variable)
const JWT_SECRET = 'hr_ops_secret_key_2024';

/**
 * Verify JWT token from Authorization header
 * Attaches decoded user info to req.user
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Invalid token format.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, username, role, email }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Role-based access control middleware
 * Usage: requireRole('Admin', 'HR') - allows only Admin and HR roles
 */
function requireRole(...roles) {
  const flatRoles = roles.flat(); // support passing an array
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    
    if (!flatRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${flatRoles.join(' or ')}` 
      });
    }
    
    next();
  };
}

module.exports = { verifyToken, requireRole, JWT_SECRET };
