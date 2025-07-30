const express = require('express');
const router = express.Router();

router.post('/intent', (req, res) => {
  res.json({ success: true, message: 'Payment intent endpoint working' });
});

module.exports = router;
