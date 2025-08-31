// api/src/config/stripeConfig.js
const stripe = require('stripe');

// Inizializza Stripe con la chiave test
const stripeClient = stripe('sk_test_51Rs7kdJ9mfmkNGem3Z2rpkEDzfgNdVPCV4ba5ReuqcBz6cFmTbZD8GHEyzlk1Xj3E87FiToiLuyKOgKLAGkY7pWD005nXB4n1P');

module.exports = stripeClient;