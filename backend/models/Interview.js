// backend/models/Interview.js
// Interview model - tracks scheduled interviews and results

const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  // Reference to the application being interviewed
  applicationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Application',
    required: true 
  },
  // Interviewer assigned to conduct the interview
  interviewerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  // Scheduled date and time
  date: { 
    type: Date, 
    required: true 
  },
  time: { 
    type: String, 
    required: true  // e.g., "10:00 AM"
  },
  // Interview outcome
  result: { 
    type: String, 
    enum: ['Pending', 'Pass', 'Fail'],
    default: 'Pending' 
  },
  // Interviewer's feedback/remarks
  remarks: { 
    type: String, 
    default: '' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Interview', interviewSchema);
