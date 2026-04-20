// backend/controllers/interviewerController.js
// Interviewer operations: view assigned interviews, submit results

const Interview = require('../models/Interview');
const Application = require('../models/Application');
const Notification = require('../models/Notification');

/**
 * GET /api/interviewer/interviews
 * Get all interviews assigned to this interviewer
 */
async function getMyInterviews(req, res) {
  try {
    const interviews = await Interview.find({ 
      interviewerId: req.user.userId 
    })
    .populate('applicationId', 'applicantName applicantEmail opportunityId status')
    .sort({ date: 1 });

    res.json(interviews);
  } catch (err) {
    console.error('[Interviewer] Fetch interviews error:', err);
    res.status(500).json({ error: 'Failed to fetch interviews.' });
  }
}

/**
 * PUT /api/interviewer/:id/submit-result
 * Submit interview result (Pass/Fail) with remarks
 */
async function submitResult(req, res) {
  try {
    const { id } = req.params;
    const { result, remarks } = req.body;

    // Validate input
    if (!result || !['Pass', 'Fail'].includes(result)) {
      return res.status(400).json({ error: 'Result must be "Pass" or "Fail".' });
    }

    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    // Update interview record
    interview.result = result;
    interview.remarks = remarks || '';
    await interview.save();

    // Update application status and result
    const application = await Application.findById(interview.applicationId);
    if (application) {
      application.status = 'Interview Done';
      application.interviewResult = result;
      await application.save();

      // Notify the assigned manager about result
      if (application.assignedManager) {
        await Notification.create({
          userId: application.assignedManager,
          message: `Interview result for ${application.applicantName}: ${result}. Remarks: ${remarks || 'None'}. Please make final decision.`
        });
      }
    }

    res.json({ message: `Interview result submitted: ${result}` });
  } catch (err) {
    console.error('[Interviewer] Submit result error:', err);
    res.status(500).json({ error: 'Failed to submit interview result.' });
  }
}

module.exports = { getMyInterviews, submitResult };
