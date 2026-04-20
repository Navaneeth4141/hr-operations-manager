// backend/controllers/adminController.js
// Admin operations: stats, reports, data export

const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Company = require('../models/Company');

/**
 * GET /api/admin/stats
 * Get aggregate statistics for the admin dashboard
 */
async function getStats(req, res) {
  try {
    const { companyId } = req.query;
    const filter = companyId ? { companyId } : {};

    const totalApplicants = await Application.countDocuments(filter);
    const selected = await Application.countDocuments({ 
      ...filter,
      status: { $in: ['Selected', 'Offer Sent', 'Offer Accepted'] } 
    });
    const rejected = await Application.countDocuments({ 
      ...filter,
      status: { $in: ['Rejected', 'Offer Rejected'] } 
    });
    const pending = await Application.countDocuments({ 
      ...filter,
      status: { $in: ['Applied', 'HR Review', 'Shortlisted', 'Interview Scheduled', 'Interview Done'] } 
    });
    const offerAccepted = await Application.countDocuments({ ...filter, status: 'Offer Accepted' });

    // If no companyId → company-wise breakdown (overall view)
    if (!companyId) {
      const companies = await Company.find().lean();
      const companyStats = {};
      for (const company of companies) {
        const cId = company._id.toString();
        const total = await Application.countDocuments({ companyId: cId });
        const sel = await Application.countDocuments({ companyId: cId, status: { $in: ['Selected', 'Offer Sent', 'Offer Accepted'] } });
        const rej = await Application.countDocuments({ companyId: cId, status: { $in: ['Rejected', 'Offer Rejected'] } });
        companyStats[company.name] = { total, selected: sel, rejected: rej };
      }
      return res.json({ totalApplicants, selected, rejected, pending, offerAccepted, companyStats, mode: 'overall' });
    }

    // If companyId → department-wise breakdown
    const oppFilter = { companyId };
    const opportunities = await Opportunity.find(oppFilter);
    const deptStats = {};
    for (const opp of opportunities) {
      const deptApps = await Application.countDocuments({ opportunityId: opp.opportunityId });
      const deptSelected = await Application.countDocuments({ opportunityId: opp.opportunityId, status: { $in: ['Selected', 'Offer Sent', 'Offer Accepted'] } });
      const deptRejected = await Application.countDocuments({ opportunityId: opp.opportunityId, status: { $in: ['Rejected', 'Offer Rejected'] } });
      if (!deptStats[opp.department]) deptStats[opp.department] = { total: 0, selected: 0, rejected: 0 };
      deptStats[opp.department].total += deptApps;
      deptStats[opp.department].selected += deptSelected;
      deptStats[opp.department].rejected += deptRejected;
    }
    return res.json({ totalApplicants, selected, rejected, pending, offerAccepted, departmentStats: deptStats, mode: 'company' });
  } catch (err) {
    console.error('[Admin] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
}

/**
 * GET /api/admin/reports
 * Get filterable report data
 * Query params: department, status, startDate, endDate
 */
async function getReports(req, res) {
  try {
    const { department, status, startDate, endDate } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // If department filter, first find matching opportunity IDs
    if (department) {
      const opps = await Opportunity.find({ department });
      const oppIds = opps.map(o => o.opportunityId);
      filter.opportunityId = { $in: oppIds };
    }

    const applications = await Application.find(filter)
      .populate('assignedHR', 'username')
      .populate('assignedManager', 'username')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error('[Admin] Reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
}

/**
 * GET /api/admin/export
 * Export report data as JSON (frontend converts to Excel using SheetJS)
 */
async function exportData(req, res) {
  try {
    const { department, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    if (department) {
      const opps = await Opportunity.find({ department });
      const oppIds = opps.map(o => o.opportunityId);
      filter.opportunityId = { $in: oppIds };
    }

    const applications = await Application.find(filter).lean();

    // Format for export - flatten nested data
    const exportData = applications.map(app => ({
      'Applicant Name': app.applicantName,
      'Email': app.applicantEmail,
      'Opportunity ID': app.opportunityId,
      'Status': app.status,
      'Rejection Reason': app.rejectionReason || '-',
      'Interview Result': app.interviewResult || '-',
      'Employee ID': app.employeeId || '-',
      'Official Email': app.officialEmail || '-',
      'Applied Date': new Date(app.createdAt).toLocaleDateString(),
      'Last Updated': new Date(app.updatedAt).toLocaleDateString()
    }));

    res.json(exportData);
  } catch (err) {
    console.error('[Admin] Export error:', err);
    res.status(500).json({ error: 'Failed to export data.' });
  }
}

// ==== Multitenant Admin Functions ====

/**
 * GET /api/admin/companies
 */
async function getCompanies(req, res) {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
}

/**
 * POST /api/admin/companies
 */
async function createCompany(req, res) {
  try {
    const { name, description, website } = req.body;
    const company = await Company.create({ name, description, website });
    res.status(201).json(company);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create company' });
  }
}

/**
 * POST /api/admin/companies/:id/hr
 */
async function createCompanyHR(req, res) {
  try {
    const { username, password, email } = req.body;
    const { id } = req.params;
    
    // Check if company exists
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const newHR = await User.create({
      username,
      password,
      email,
      role: 'CompanyHR',
      companyId: id
    });
    res.status(201).json({ message: 'Company HR created', user: { username, email, role: 'CompanyHR' }});
  } catch (err) {
    res.status(500).json({ error: 'Failed to create Company HR. Ensure email and username are unique.' });
  }
}

/**
 * DELETE /api/admin/users/:id
 */
async function deleteUser(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'Admin') return res.status(403).json({ error: 'Cannot delete admin' });
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

module.exports = { getStats, getReports, exportData, getCompanies, createCompany, createCompanyHR, deleteUser };
