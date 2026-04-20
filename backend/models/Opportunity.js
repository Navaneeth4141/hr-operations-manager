// backend/models/Opportunity.js
// Job opportunity model - each opportunity is assigned to an HR and department

const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  opportunityId: { 
    type: String, 
    required: true, 
    unique: true  // e.g., "OPP-101"
  },
  title: { 
    type: String, 
    required: true  // e.g., "Software Engineer"
  },
  description: {
    type: String,
    required: true
  },
  department: { 
    type: String, 
    required: true  // e.g., "Engineering"
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // HR user assigned to handle applications for this opportunity
  hrAssigned: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  // Manager who will review shortlisted candidates
  managerAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  isActive: {
    type: Boolean,
    default: true  // false = applications closed
  }
});

module.exports = mongoose.model('Opportunity', opportunitySchema);
