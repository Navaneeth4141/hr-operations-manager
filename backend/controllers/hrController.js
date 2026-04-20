// backend/controllers/hrController.js
// HR operations: view applications, shortlist, reject, send offers

const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Email = require('../models/Email');
const Department = require('../models/Department');

/**
 * GET /api/hr/applications
 * Get all applications assigned to this HR user
 */
async function getAssignedApplications(req, res) {
  try {
    const applications = await Application.find({ 
      assignedHR: req.user.userId 
    })
    .populate('assignedManager', 'username')
    .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error('[HR] Fetch applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications.' });
  }
}

/**
 * PUT /api/hr/:id/shortlist
 * Shortlist a candidate and assign to a manager
 */
async function shortlistCandidate(req, res) {
  try {
    const { id } = req.params;
    const { managerId } = req.body;

    if (!managerId) {
      return res.status(400).json({ error: 'Manager ID is required for shortlisting.' });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Update status and assign manager
    application.status = 'Shortlisted';
    application.assignedManager = managerId;
    await application.save();

    // Notify the assigned manager
    await Notification.create({
      userId: managerId,
      message: `New shortlisted candidate: ${application.applicantName} for ${application.opportunityId}. Please review and schedule interview.`
    });

    // Simulate email to applicant about shortlisting
    await Email.create({
      from: 'hr-system@company.com',
      to: application.applicantEmail,
      subject: `Application Update - Shortlisted`,
      body: `Dear ${application.applicantName},\n\nWe are pleased to inform you that your application for position ${application.opportunityId} has been shortlisted.\nYou will be contacted soon for an interview.\n\nBest regards,\nHR Operations Team`
    });

    res.json({ message: 'Candidate shortlisted and forwarded to manager.' });
  } catch (err) {
    console.error('[HR] Shortlist error:', err);
    res.status(500).json({ error: 'Failed to shortlist candidate.' });
  }
}

/**
 * PUT /api/hr/:id/reject
 * Reject a candidate with a reason
 */
async function rejectCandidate(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    application.status = 'Rejected';
    application.rejectionReason = reason;
    await application.save();

    // Simulate rejection email
    await Email.create({
      from: 'hr-system@company.com',
      to: application.applicantEmail,
      subject: `Application Update - ${application.opportunityId}`,
      body: `Dear ${application.applicantName},\n\nThank you for your interest in position ${application.opportunityId}.\nAfter careful review, we regret to inform you that your application has not been selected to proceed further.\n\nReason: ${reason}\n\nWe wish you the best in your future endeavors.\n\nBest regards,\nHR Operations Team`
    });

    res.json({ message: 'Candidate rejected. Rejection email sent.' });
  } catch (err) {
    console.error('[HR] Reject error:', err);
    res.status(500).json({ error: 'Failed to reject candidate.' });
  }
}

/**
 * PUT /api/hr/:id/send-offer
 * Generate and send offer letter to selected candidate
 */
async function sendOffer(req, res) {
  try {
    const { id } = req.params;
    
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (application.status !== 'Selected') {
      return res.status(400).json({ error: 'Can only send offers to selected candidates.' });
    }

    // Generate offer letter content
    const offerLetter = `
OFFER LETTER
============
Date: ${new Date().toLocaleDateString()}

Dear ${application.applicantName},

We are pleased to offer you the position for Opportunity ${application.opportunityId}.

This offer is contingent upon successful completion of background verification.

Please respond to this offer within 7 business days.

Sincerely,
HR Operations Team
    `.trim();

    application.status = 'Offer Sent';
    application.offerLetter = offerLetter;
    await application.save();

    // Simulate email with offer letter
    await Email.create({
      from: 'hr-system@company.com',
      to: application.applicantEmail,
      subject: `Job Offer - ${application.opportunityId}`,
      body: offerLetter
    });

    // Notify applicant user (if registered)
    if (application.applicantUser) {
      await Notification.create({
        userId: application.applicantUser,
        message: `You have received an offer letter for ${application.opportunityId}! Please check your dashboard to accept or reject.`
      });
    }

    res.json({ message: 'Offer letter sent to candidate.' });
  } catch (err) {
    console.error('[HR] Send offer error:', err);
    res.status(500).json({ error: 'Failed to send offer.' });
  }
}

// ==== Multitenant CompanyHR Functions ====

/**
 * GET /api/hr/subaccounts
 */
async function getSubAccounts(req, res) {
  try {
    const users = await User.find({ companyId: req.user.companyId, role: { $in: ['Manager', 'Interviewer'] } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
}

/**
 * POST /api/hr/subaccounts
 */
async function createSubAccount(req, res) {
  try {
    const { username, password, email, role, department } = req.body;
    if (!['Manager', 'Interviewer'].includes(role)) {
       return res.status(400).json({ error: 'Invalid role' });
    }
    const newUser = await User.create({
      username, password, email, role, department, companyId: req.user.companyId
    });
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
}

/**
 * DELETE /api/hr/subaccounts/:id
 */
async function deleteSubAccount(req, res) {
  try {
    const user = await User.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!user) return res.status(404).json({ error: 'User not found or not in your company' });
    if (user.role === 'CompanyHR') return res.status(403).json({ error: 'Cannot delete HR' });
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
}

/**
 * POST /api/hr/opportunities
 */
async function createOpportunity(req, res) {
  try {
    const { title, description, department, opportunityId } = req.body;
    const opp = await Opportunity.create({
      opportunityId, title, description, department, hrAssigned: req.user.userId, companyId: req.user.companyId
    });
    res.status(201).json(opp);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
}

/**
 * GET /api/hr/departments
 */
async function getDepartments(req, res) {
  try {
    const depts = await Department.find({ companyId: req.user.companyId }).sort({ name: 1 });
    res.json(depts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
}

/**
 * POST /api/hr/departments
 */
async function addDepartment(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name required' });
    const dept = await Department.create({ name: name.trim(), companyId: req.user.companyId });
    res.status(201).json(dept);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Department already exists' });
    res.status(500).json({ error: 'Failed to add department' });
  }
}

/**
 * DELETE /api/hr/departments/:name
 */
async function deleteDepartment(req, res) {
  try {
    await Department.deleteOne({ name: req.params.name, companyId: req.user.companyId });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
}

/**
 * GET /api/hr/opportunities
 */
async function getMyOpportunities(req, res) {
  try {
    const opps = await Opportunity.find({ hrAssigned: req.user.userId }).sort({ createdAt: -1 });
    res.json(opps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
}

/**
 * PUT /api/hr/opportunities/:id/toggle
 * Toggle isActive status of a job posting
 */
async function toggleOpportunity(req, res) {
  try {
    const opp = await Opportunity.findOne({ _id: req.params.id, hrAssigned: req.user.userId });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    opp.isActive = !opp.isActive;
    await opp.save();
    res.json({ message: opp.isActive ? 'Applications reopened' : 'Applications closed', isActive: opp.isActive });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle opportunity' });
  }
}

/**
 * DELETE /api/hr/opportunities/:id
 * Permanently delete a job posting
 */
async function deleteOpportunity(req, res) {
  try {
    const opp = await Opportunity.findOneAndDelete({ _id: req.params.id, hrAssigned: req.user.userId });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    res.json({ message: 'Job posting deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete opportunity' });
  }
}

module.exports = { 
  getAssignedApplications, 
  shortlistCandidate, 
  rejectCandidate, 
  sendOffer,
  getSubAccounts,
  createSubAccount,
  deleteSubAccount,
  createOpportunity,
  getDepartments,
  addDepartment,
  deleteDepartment,
  getMyOpportunities,
  toggleOpportunity,
  deleteOpportunity
};
