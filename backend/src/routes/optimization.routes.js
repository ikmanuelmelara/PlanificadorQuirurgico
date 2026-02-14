const express = require('express');
const router = express.Router();
const { getCriteria } = require('../services/optimization/criteriaDefinitions');
const { optimize } = require('../services/optimization/prescriptiveEngine');
const OptimizationResult = require('../models/OptimizationResult');

// GET /api/optimization/criteria — List available criteria
router.get('/criteria', (req, res) => {
  res.json({ success: true, data: getCriteria() });
});

// POST /api/optimization/run — Execute optimization
router.post('/run', async (req, res) => {
  try {
    const { cutoffDate, criteria, useCurrentAllocation, usePredictions, maxIterations } = req.body;

    if (!cutoffDate) {
      return res.status(400).json({ success: false, error: 'Se requiere cutoffDate' });
    }

    const parsedDate = new Date(cutoffDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: 'cutoffDate no es una fecha válida' });
    }

    const result = await optimize({
      cutoffDate: parsedDate,
      criteria: criteria || [],
      useCurrentAllocation: useCurrentAllocation !== false,
      usePredictions: usePredictions !== false,
      maxIterations: maxIterations || 1000,
    });

    // Return without the full schedule to keep response smaller
    const { optimalSchedule, ...summary } = result;
    summary.totalSessions = optimalSchedule.length;

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/optimization/latest — Get latest optimization result
router.get('/latest', async (req, res) => {
  try {
    const result = await OptimizationResult.findOne()
      .sort({ createdAt: -1 })
      .lean();

    if (!result) {
      return res.status(404).json({ success: false, error: 'No hay optimizaciones guardadas' });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/optimization/history — List past optimizations (metadata only)
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      OptimizationResult.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('cutoffDate scores.totalScore scores.hardConstraintsMet comparison.sessionsChanged config createdAt')
        .lean(),
      OptimizationResult.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
