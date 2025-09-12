require('dotenv').config();

console.log('ENV variables loaded:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Merchant ID:', process.env.OEN_PAYMENT_TEST_MERCHANT_ID);
console.log('Token exists:', !!process.env.OEN_PAYMENT_TEST_AUTH_TOKEN);
console.log('Token length:', process.env.OEN_PAYMENT_TEST_AUTH_TOKEN?.length);

if (process.env.OEN_PAYMENT_TEST_AUTH_TOKEN) {
    console.log('Token first 50 chars:', process.env.OEN_PAYMENT_TEST_AUTH_TOKEN.substring(0, 50) + '...');
} else {
    console.log('❌ Token not found');
}