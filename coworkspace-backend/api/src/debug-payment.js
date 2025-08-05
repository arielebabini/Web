// TEMPORANEO: File di debug per testare il PaymentController
// Salva questo come: api/src/debug-payment.js

console.log('🔍 DEBUG: Testing PaymentController import...');

try {
    const PaymentController = require('./controllers/paymentController');

    console.log('✅ PaymentController imported successfully');
    console.log('📋 Available methods:');

    // Lista tutti i metodi disponibili
    const methods = Object.getOwnPropertyNames(PaymentController)
        .filter(name => typeof PaymentController[name] === 'function');

    methods.forEach(method => {
        console.log(`   - ${method}: ${typeof PaymentController[method]}`);
    });

    // Test specifici per i metodi usati nelle route
    const requiredMethods = [
        'healthCheck',
        'testStripeConnection',
        'createPaymentIntent',
        'getPaymentStatus',
        'getUserPayments',
        'handleStripeWebhook',
        'getPaymentStats'
    ];

    console.log('\n🎯 Checking required methods:');
    requiredMethods.forEach(method => {
        const exists = typeof PaymentController[method] === 'function';
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} ${method}: ${exists ? 'OK' : 'MISSING'}`);

        if (!exists) {
            console.log(`      Type: ${typeof PaymentController[method]}`);
            console.log(`      Value: ${PaymentController[method]}`);
        }
    });

} catch (error) {
    console.error('❌ Failed to import PaymentController:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
}

console.log('\n🔍 Testing individual imports...');

// Test import del StripeService
try {
    const StripeService = require('./services/stripeService');
    console.log('✅ StripeService imported successfully');

    const stripeMethods = Object.getOwnPropertyNames(StripeService)
        .filter(name => typeof StripeService[name] === 'function');
    console.log('📋 StripeService methods:', stripeMethods);
} catch (error) {
    console.error('❌ StripeService import failed:', error.message);
}

// Test import del Payment model
try {
    const Payment = require('./models/Payment');
    console.log('✅ Payment model imported successfully');

    const paymentMethods = Object.getOwnPropertyNames(Payment)
        .filter(name => typeof Payment[name] === 'function');
    console.log('📋 Payment methods:', paymentMethods);
} catch (error) {
    console.error('❌ Payment model import failed:', error.message);
}

// Test import del Booking model
try {
    const Booking = require('./models/Booking');
    console.log('✅ Booking model imported successfully');
} catch (error) {
    console.error('❌ Booking model import failed:', error.message);
}

// Test import del User model
try {
    const User = require('./models/User');
    console.log('✅ User model imported successfully');
} catch (error) {
    console.error('❌ User model import failed:', error.message);
}

console.log('\n🏁 Debug completed!');