const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { 
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
} = require('../controllers/hrController');

// All routes require CompanyHR role
router.use(verifyToken, requireRole('CompanyHR'));

router.get('/applications', getAssignedApplications);
router.put('/:id/shortlist', shortlistCandidate);
router.put('/:id/reject', rejectCandidate);
router.put('/:id/send-offer', sendOffer);

router.get('/subaccounts', getSubAccounts);
router.post('/subaccounts', createSubAccount);
router.delete('/subaccounts/:id', deleteSubAccount);

router.get('/opportunities', getMyOpportunities);
router.post('/opportunities', createOpportunity);
router.put('/opportunities/:id/toggle', toggleOpportunity);
router.delete('/opportunities/:id', deleteOpportunity);

router.get('/departments', getDepartments);
router.post('/departments', addDepartment);
router.delete('/departments/:name', deleteDepartment);

module.exports = router;
