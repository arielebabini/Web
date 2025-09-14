// tests/setup/setEnvVars.js

// Imposta TUTTE le variabili d'ambiente necessarie per i test
// Questo file verrà eseguito da Jest prima di ogni altro codice.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent'; // Mettilo qui per non ripeterlo in ogni file
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';

// Puoi mettere qui anche le chiavi di Google se sono fisse per i test
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';