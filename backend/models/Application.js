// backend/models/Application.js
// Application model - tracks candidate through entire hiring workflow
// Status flow: Applied -> HR Review -> Shortlisted -> Interview Scheduled -> 
//              Interview Done -> Selected/Rejected -> Offer Sent -> Offer Accepted/Rejected

const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Applicant details (extracted from form / email parsing simulation)
  applicantName: { 
    type: String, 
    required: true 
  },
  applicantEmail: { 
    type: String, 
    required: true 
  },
  // Reference to User account (if applicant registered)
  applicantUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Path to uploaded resume file
  resumePath: { 
    type: String, 
    default: '' 
  },
  opportunityId: { 
    type: String, 
    required: true 
  },
  // Added companyId to easily filter applications by company
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // Current status in the workflow
  status: { 
    type: String, 
    enum: [
      'Applied', 
      'HR Review', 
      'Shortlisted', 
      'Rejected', 
      'Interview Scheduled', 
      'Interview Done', 
      'Selected', 
      'Offer Sent', 
      'Offer Accepted', 
      'Offer Rejected'
    ],
    default: 'Applied' 
  },
  // Reason for rejection (filled by HR or Manager)
  rejectionReason: { 
    type: String, 
    default: '' 
  },
  // HR assigned based on opportunity routing
  assignedHR: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  // Manager assigned by HR during shortlisting
  assignedManager: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  // Interview result summary
  interviewResult: { 
    type: String, 
    default: '' 
  },
  // Simulated offer letter content
  offerLetter: { 
    type: String, 
    default: '' 
  },
  // Generated on offer acceptance
  employeeId: { 
    type: String, 
    default: '' 
  },
  officialEmail: { 
    type: String, 
    default: '' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt timestamp on every save
applicationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Application', applicationSchema);
