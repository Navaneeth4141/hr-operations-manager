// backend/controllers/applicationController.js
// Handles application submission and applicant-side actions

const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Email = require('../models/Email');

/**
 * POST /api/applications/apply
 * Submit a new job application (with resume upload)
 */
async function submitApplication(req, res) {
  try {
    const { applicantName, applicantEmail, opportunityId } = req.body;

    // Validate required fields
    if (!applicantName || !applicantEmail || !opportunityId) {
      return res.status(400).json({ 
        error: 'Name, email, and Opportunity ID are required.' 
      });
    }

    // Check if opportunity exists
    const opportunity = await Opportunity.findOne({ opportunityId });
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity ID not found.' });
    }

    // Prevent duplicate applications for same user + job
    if (req.user && req.user.userId) {
      const existing = await Application.findOne({
        applicantUser: req.user.userId,
        opportunityId
      });
      if (existing) {
        return res.status(409).json({ error: 'You have already applied for this position.' });
      }
    }

    // Get resume file path if uploaded
    const resumePath = req.file ? req.file.path : '';

    // Create application record
    const application = new Application({
      applicantName,
      applicantEmail,
      resumePath,
      opportunityId,
      companyId: opportunity.companyId,
      status: 'Applied',
      assignedHR: opportunity.hrAssigned,
      applicantUser: req.user.userId
    });

    await application.save();

    // --- Email Parsing Simulation ---
    // In a real system, this would parse an incoming email
    // Here we simulate by extracting structured fields from the form
    console.log('[Email Parse] Extracted data:', {
      name: applicantName,
      email: applicantEmail,
      opportunityId: opportunityId,
      department: opportunity.department
    });

    // Simulate confirmation email to applicant
    await Email.create({
      from: 'hr-system@company.com',
      to: applicantEmail,
      subject: `Application Received - ${opportunity.title}`,
      body: `Dear ${applicantName},\n\nThank you for applying to the ${opportunity.title} position (${opportunityId}).\nYour application has been received and is under review.\n\nBest regards,\nHR Operations Team`
    });

    // Notify the assigned HR about new application
    if (opportunity.hrAssigned) {
      await Notification.create({
        userId: opportunity.hrAssigned,
        message: `New application received from ${applicantName} for ${opportunity.title} (${opportunityId})`
      });
    }

    res.status(201).json({
      message: 'Application submitted successfully!',
      applicationId: application._id,
      status: application.status
    });
  } catch (err) {
    console.error('[Application] Submit error:', err);
    res.status(500).json({ error: 'Failed to submit application.' });
  }
}

/**
 * GET /api/applications/my
 * Get all applications for the logged-in applicant
 */
async function getMyApplications(req, res) {
  try {
    // Find applications by applicant's email
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const applications = await Application.find({ 
      applicantEmail: user.email 
    }).sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error('[Application] Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch applications.' });
  }
}

/**
 * PUT /api/applications/:id/respond
 * Applicant accepts or rejects an offer
 */
async function respondToOffer(req, res) {
  try {
    const { id } = req.params;
    const { response } = req.body; // 'accept' or 'reject'

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Can only respond to sent offers
    if (application.status !== 'Offer Sent') {
      return res.status(400).json({ error: 'No offer pending for this application.' });
    }

    if (response === 'accept') {
      // Generate Employee ID and official email
      const empCount = await Application.countDocuments({ status: 'Offer Accepted' });
      const employeeId = 'EMP-' + String(empCount + 1001).padStart(5, '0');
      const officialEmail = application.applicantName.toLowerCase().replace(/\s+/g, '.') + '@company.com';

      application.status = 'Offer Accepted';
      application.employeeId = employeeId;
      application.officialEmail = officialEmail;
      await application.save();

      // Update the user record too (if exists)
      if (application.applicantUser) {
        await User.findByIdAndUpdate(application.applicantUser, {
          employeeId,
          officialEmail
        });
      }

      // Simulate welcome email
      await Email.create({
        from: 'hr-system@company.com',
        to: application.applicantEmail,
        subject: 'Welcome to the Team!',
        body: `Dear ${application.applicantName},\n\nCongratulations! Your offer has been accepted.\n\nEmployee ID: ${employeeId}\nOfficial Email: ${officialEmail}\n\nWelcome aboard!\n\nBest regards,\nHR Operations Team`
      });

      // Notify HR
      if (application.assignedHR) {
        await Notification.create({
          userId: application.assignedHR,
          message: `${application.applicantName} has ACCEPTED the offer. Employee ID: ${employeeId}`
        });
      }

      res.json({
        message: 'Offer accepted! Welcome aboard!',
        employeeId,
        officialEmail
      });
    } else if (response === 'reject') {
      application.status = 'Offer Rejected';
      await application.save();

      // Notify HR about rejection
      if (application.assignedHR) {
        await Notification.create({
          userId: application.assignedHR,
          message: `${application.applicantName} has REJECTED the offer for ${application.opportunityId}.`
        });
      }

      res.json({ message: 'Offer declined. Process ended.' });
    } else {
      res.status(400).json({ error: 'Response must be "accept" or "reject".' });
    }
  } catch (err) {
    console.error('[Application] Respond error:', err);
    res.status(500).json({ error: 'Failed to process response.' });
  }
}

/**
 * GET /api/applications/opportunities
 * Get all available opportunities (for the apply form dropdown)
 */
async function getOpportunities(req, res) {
  try {
    const opportunities = await Opportunity.find().select('opportunityId title department');
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunities.' });
  }
}

module.exports = { submitApplication, getMyApplications, respondToOffer, getOpportunities };
