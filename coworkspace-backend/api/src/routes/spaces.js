const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ 
    success: true, 
    data: [
      { id: 1, name: 'Milano Business Hub', city: 'Milano' },
      { id: 2, name: 'Roma Creative Space', city: 'Roma' }
    ]
  });
});

module.exports = router;
