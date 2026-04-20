// backend/controllers/managerController.js
// Manager operations: view shortlisted, schedule interviews, final decisions

const Application = require('../models/Application');
const Interview = require('../models/Interview');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * GET /api/manager/applications
 * Get all applications assigned to this manager
 */
async function getManagerApplications(req, res) {
  try {
    const applications = await Application.find({ 
      assignedManager: req.user.userId 
    }).sort({ createdAt: -1 });

    // Also fetch associated interviews
    const appIds = applications.map(a => a._id);
    const interviews = await Interview.find({ 
      applicationId: { $in: appIds } 
    }).populate('interviewerId', 'username');

    // Attach interview data to applications
    const result = applications.map(app => {
      const interview = interviews.find(
        i => i.applicationId.toString() === app._id.toString()
      );
      return {
        ...app.toObject(),
        interview: interview || null
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[Manager] Fetch applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications.' });
  }
}

/**
 * PUT /api/manager/:id/schedule-interview
 * Schedule an interview for a shortlisted candidate
 */
async function scheduleInterview(req, res) {
  try {
    const { id } = req.params;
    const { interviewerId, date, time } = req.body;

    // Validate input
    if (!interviewerId || !date || !time) {
      return res.status(400).json({ 
        error: 'Interviewer, date, and time are required.' 
      });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Create or update interview record
    let interview = await Interview.findOne({ applicationId: id });
    if (interview) {
      interview.interviewerId = interviewerId;
      interview.date = new Date(date);
      interview.time = time;
      interview.result = 'Pending';
      interview.remarks = '';
      await interview.save();
    } else {
      interview = await Interview.create({
        applicationId: id,
        interviewerId,
        date: new Date(date),
        time
      });
    }

    // Update application status
    application.status = 'Interview Scheduled';
    await application.save();

    // Notify the interviewer
    await Notification.create({
      userId: interviewerId,
      message: `Interview assigned: ${application.applicantName} on ${date} at ${time} for ${application.opportunityId}`
    });

    res.json({ message: 'Interview scheduled successfully.' });
  } catch (err) {
    console.error('[Manager] Schedule interview error:', err);
    res.status(500).json({ error: 'Failed to schedule interview.' });
  }
}

/**
 * PUT /api/manager/:id/final-decision
 * Manager makes final hiring decision after interview
 */
async function makeFinalDecision(req, res) {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body; // 'selected' or 'rejected'

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (decision === 'selected') {
      application.status = 'Selected';
      await application.save();

      // Notify HR to send offer
      if (application.assignedHR) {
        await Notification.create({
          userId: application.assignedHR,
          message: `${application.applicantName} has been SELECTED for ${application.opportunityId}. Please send the offer letter.`
        });
      }

      res.json({ message: 'Candidate selected. HR notified to send offer.' });
    } else if (decision === 'rejected') {
      application.status = 'Rejected';
      application.rejectionReason = reason || 'Did not pass final evaluation';
      await application.save();

      // Notify HR about rejection
      if (application.assignedHR) {
        await Notification.create({
          userId: application.assignedHR,
          message: `${application.applicantName} has been REJECTED after interview for ${application.opportunityId}. Reason: ${application.rejectionReason}`
        });
      }

      res.json({ message: 'Candidate rejected after interview.' });
    } else {
      res.status(400).json({ error: 'Decision must be "selected" or "rejected".' });
    }
  } catch (err) {
    console.error('[Manager] Final decision error:', err);
    res.status(500).json({ error: 'Failed to update decision.' });
  }
}

module.exports = { getManagerApplications, scheduleInterview, makeFinalDecision };
