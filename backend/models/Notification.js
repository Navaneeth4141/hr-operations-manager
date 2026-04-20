// backend/models/Notification.js
// In-app notification model for all users

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // User who receives this notification
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  // Whether the user has read this notification
  read: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
