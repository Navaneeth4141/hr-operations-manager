// backend/controllers/publicController.js
// Handles public access to job postings and company details

const Opportunity = require('../models/Opportunity');
const Company = require('../models/Company');

// Get all open jobs for the public board
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Opportunity.find({ isActive: { $ne: false } })
      .populate('companyId', 'name logo website')
      .sort({ createdAt: -1 });
    
    res.json(jobs);
  } catch (error) {
    console.error('[PublicController] Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch job opportunities' });
  }
};

// Get job details by ID
exports.getJobDetails = async (req, res) => {
  try {
    const job = await Opportunity.findById(req.params.id)
      .populate('companyId', 'name description website');
      
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    console.error('[PublicController] Error fetching job details:', error);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
};
