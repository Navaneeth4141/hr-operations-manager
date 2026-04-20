// backend/routes/notificationRoutes.js
// Notification routes for all authenticated users

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getNotifications, markAsRead, getUnreadCount } = require('../controllers/notificationController');

// All routes require authentication
router.use(verifyToken);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);

module.exports = router;
