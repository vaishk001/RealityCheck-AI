function notFoundHandler(req, res, next) {
  res.status(404).json({ message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  if (err?.name === 'MulterError') {
    return res.status(400).json({ message: err.message || 'File upload error' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({ message });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
