// backend/scripts/clearData.js
// Script to clear transactional data while preserving users and companies

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const Interview = require('../models/Interview');
const Notification = require('../models/Notification');
const ApplicantProfile = require('../models/ApplicantProfile');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const Email = require('../models/Email');
const Department = require('../models/Department');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hr_ops';

async function clearData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    console.log('Clearing transactional collections...');

    await Promise.all([
      Application.deleteMany({}),
      Opportunity.deleteMany({}),
      Interview.deleteMany({}),
      Notification.deleteMany({}),
      ApplicantProfile.deleteMany({}),
      PasswordResetRequest.deleteMany({}),
      Email.deleteMany({}),
      Department.deleteMany({})
    ]);

    console.log('Successfully cleared: Applications, Opportunities, Interviews, Notifications, ApplicantProfiles, PasswordResetRequests, Emails, Departments.');
    console.log('Preserved: Users and Companies.');

    process.exit(0);
  } catch (err) {
    console.error('Error clearing data:', err);
    process.exit(1);
  }
}

clearData();
