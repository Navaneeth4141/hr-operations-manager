// backend/models/Email.js
// Simulated email model - stores all "sent" emails for demo purposes
// No real SMTP - emails are just database records

const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  from: { 
    type: String, 
    required: true 
  },
  to: { 
    type: String, 
    required: true 
  },
  subject: { 
    type: String, 
    required: true 
  },
  body: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Email', emailSchema);
