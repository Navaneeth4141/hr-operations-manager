// backend/routes/publicRoutes.js
// Public routes that don't require authentication

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/jobs', publicController.getAllJobs);
router.get('/jobs/:id', publicController.getJobDetails);

module.exports = router;
