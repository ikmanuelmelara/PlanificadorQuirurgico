const express = require('express');
const router = express.Router();
const LearnedConstraint = require('../models/LearnedConstraint');
const { learnFromHistory, getSummary } = require('../services/learning/constraintLearner');

// POST /api/learning/run — Execute constraint learning
router.post('/run', async (req, res) => {
  try {
    const options = req.body || {};
    const summary = await learnFromHistory(options);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/learning/constraints — List learned constraints
router.get('/constraints', async (req, res) => {
  try {
    const { type, category, discoveryMethod, isValidated, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (discoveryMethod) filter.discoveryMethod = discoveryMethod;
    if (isValidated !== undefined) filter.isValidated = isValidated === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      LearnedConstraint.find(filter)
        .sort({ confidence: -1, support: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      LearnedConstraint.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/learning/constraints/:id/validate — Validate or reject a constraint
router.put('/constraints/:id/validate', async (req, res) => {
  try {
    const { isValid } = req.body;
    if (typeof isValid !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Se requiere campo "isValid" (boolean)' });
    }

    const constraint = await LearnedConstraint.findByIdAndUpdate(
      req.params.id,
      {
        isValidated: isValid,
        activeInOptimization: isValid,
      },
      { new: true },
    );

    if (!constraint) {
      return res.status(404).json({ success: false, error: 'Restricción no encontrada' });
    }

    res.json({ success: true, data: constraint });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/learning/summary — Summary of all constraints
router.get('/summary', async (req, res) => {
  try {
    const summary = await getSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
