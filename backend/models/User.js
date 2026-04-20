// backend/models/User.js
// User model - supports all roles: Admin, HR, Manager, Interviewer, Applicant

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true 
  },
  role: { 
    type: String, 
    enum: ['Admin', 'CompanyHR', 'Manager', 'Interviewer', 'Applicant'], 
    required: true 
  },
  // Sub-accounts and HRs belong to a Company. Admin and Applicant do not (null).
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  department: { 
    type: String, 
    default: '' 
  },
  // These are generated when an applicant accepts an offer
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
  }
});

// Hash password before saving to database
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Instance method to compare passwords during login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
