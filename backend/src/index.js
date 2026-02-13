const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7860;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
const dataRoutes = require('./routes/data.routes');
const predictionRoutes = require('./routes/prediction.routes');
const learningRoutes = require('./routes/learning.routes');
app.use('/api/data', dataRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/learning', learningRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'planificador-quirurgico',
    database: dbStates[dbState] || 'unknown',
  });
});

// Start server
async function start() {
  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ejecutandose en puerto ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

start().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
