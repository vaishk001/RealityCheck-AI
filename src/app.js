const path = require('path');
const express = require('express');
const cors = require('cors');
const scanRoutes = require('./routes/scan.routes');
const historyRoutes = require('./routes/history.routes');
const statusRoutes = require('./routes/status.routes');
const threatReportRoutes = require('./routes/threatReport.routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve built frontend assets if they exist
const distPath = path.join(__dirname, '../web/dist');
app.use(express.static(distPath));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'RealityCheck AI API' });
});

app.use('/api', scanRoutes);
app.use('/api', historyRoutes);
app.use('/api', statusRoutes);
app.use('/api', threatReportRoutes);

// Fallback to React index.html for non-API client routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      next(); // Pass to 404 handler if build folder doesn't exist
    }
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
