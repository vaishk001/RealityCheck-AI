const express = require('express');
const scanRoutes = require('./routes/scan.routes');
const historyRoutes = require('./routes/history.routes');
const statusRoutes = require('./routes/status.routes');
const threatReportRoutes = require('./routes/threatReport.routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'RealityCheck AI API' });
});

app.use('/api', scanRoutes);
app.use('/api', historyRoutes);
app.use('/api', statusRoutes);
app.use('/api', threatReportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
