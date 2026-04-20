// backend/controllers/notificationController.js
// Notification operations for all users

const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * Get all notifications for the logged-in user
 */
async function getNotifications(req, res) {
  try {
    const notifications = await Notification.find({ 
      userId: req.user.userId 
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error('[Notifications] Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
}

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    
    await Notification.findByIdAndUpdate(id, { read: true });
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('[Notifications] Update error:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
}

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
async function getUnreadCount(req, res) {
  try {
    const count = await Notification.countDocuments({ 
      userId: req.user.userId, 
      read: false 
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get notification count.' });
  }
}

module.exports = { getNotifications, markAsRead, getUnreadCount };
