const express = require('express');
const router = express.Router();
const { generateAll, getStatistics } = require('../services/dataGenerator/syntheticDataGenerator');
const WaitingList = require('../models/WaitingList');
const HistoricalActivity = require('../models/HistoricalActivity');
const EmergencyRecord = require('../models/EmergencyRecord');
const ReferralRecord = require('../models/ReferralRecord');
const DropoutRecord = require('../models/DropoutRecord');
const Session = require('../models/Session');
const SurgicalService = require('../models/SurgicalService');
const OperatingRoom = require('../models/OperatingRoom');
const Patient = require('../models/fhir/Patient');
const ServiceRequest = require('../models/fhir/ServiceRequest');

// Model registry for export/import
const MODELS = {
  'waiting-list': WaitingList,
  'historical': HistoricalActivity,
  'emergencies': EmergencyRecord,
  'referrals': ReferralRecord,
  'dropouts': DropoutRecord,
  'sessions': Session,
  'services': SurgicalService,
  'rooms': OperatingRoom,
  'patients': Patient,
  'service-requests': ServiceRequest,
};

// POST /api/data/generate — Generate synthetic data
router.post('/generate', async (req, res) => {
  try {
    const config = req.body || {};
    const result = await generateAll(config);
    res.json({
      success: true,
      message: 'Datos sintéticos generados correctamente',
      data: result.summary,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/data/waiting-list — Get current waiting list
router.get('/waiting-list', async (req, res) => {
  try {
    const { status = 'active', priority, service, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (service) filter.surgicalService = service;

    const skip = (Number(page) - 1) * Number(limit);
    const [entries, total] = await Promise.all([
      WaitingList.find(filter)
        .populate('surgicalService', 'code name')
        .sort({ entryDate: 1 })
        .skip(skip)
        .limit(Number(limit)),
      WaitingList.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: entries,
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

// GET /api/data/statistics — Dataset statistics
router.get('/statistics', async (req, res) => {
  try {
    const stats = await getStatistics();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/data/export/:type — Export dataset as JSON
router.get('/export/:type', async (req, res) => {
  try {
    const Model = MODELS[req.params.type];
    if (!Model) {
      return res.status(400).json({
        success: false,
        error: `Tipo no válido. Disponibles: ${Object.keys(MODELS).join(', ')}`,
      });
    }

    const data = await Model.find({}).lean();
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}.json"`);
    res.json({ success: true, type: req.params.type, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/data/import/:type — Import dataset from JSON
router.post('/import/:type', async (req, res) => {
  try {
    const Model = MODELS[req.params.type];
    if (!Model) {
      return res.status(400).json({
        success: false,
        error: `Tipo no válido. Disponibles: ${Object.keys(MODELS).join(', ')}`,
      });
    }

    const { data, replace = false } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ success: false, error: 'El campo "data" debe ser un array' });
    }

    if (replace) {
      await Model.deleteMany({});
    }

    const result = await Model.insertMany(data, { ordered: false });
    res.json({
      success: true,
      message: `Importados ${result.length} registros de ${req.params.type}`,
      count: result.length,
    });
  } catch (err) {
    // Handle duplicate key errors gracefully
    if (err.code === 11000) {
      const inserted = err.insertedDocs?.length || 0;
      return res.status(207).json({
        success: true,
        message: `Importación parcial: ${inserted} insertados, algunos duplicados omitidos`,
        count: inserted,
        duplicateErrors: err.writeErrors?.length || 0,
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
