const express = require('express');
const router = express.Router();
const {
  runAllPredictions,
  getLatestPrediction,
  getPredictionHistory,
} = require('../services/prediction/predictionOrchestrator');

// POST /api/prediction/run — Execute prediction
router.post('/run', async (req, res) => {
  try {
    const { cutoffDate, include = {} } = req.body;

    if (!cutoffDate) {
      return res.status(400).json({ success: false, error: 'Se requiere cutoffDate' });
    }

    const parsedDate = new Date(cutoffDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: 'cutoffDate no es una fecha válida' });
    }

    if (parsedDate <= new Date()) {
      return res.status(400).json({ success: false, error: 'cutoffDate debe ser una fecha futura' });
    }

    const result = await runAllPredictions(parsedDate, include);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/prediction/latest — Get most recent prediction
router.get('/latest', async (req, res) => {
  try {
    const result = await getLatestPrediction();
    if (!result) {
      return res.status(404).json({ success: false, error: 'No hay predicciones guardadas' });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/prediction/history — List past predictions
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await getPredictionHistory(Number(page), Number(limit));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
