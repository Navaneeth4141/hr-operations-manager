// backend/models/PasswordResetRequest.js
// Model to track pending password reset requests for HR and Team Members

const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  company: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company',
    default: null
  },
  newPasswordHash: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('PasswordResetRequest', passwordResetSchema);
