// Error handler placeholder
function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error',
    message: err.message 
  });
}

module.exports = errorHandler;
