const Pusher = require('pusher');
require('dotenv').config({ path: '.env.local' });

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});

// Test incoming call event
const testCall = {
  id: `test-${Date.now()}`,
  callId: `binotel-test-${Date.now()}`,
  phoneNumber: '+998901234567',
  callType: 'incoming',
  callStart: Date.now(),
  isDriver: true,
  driverName: 'Test Driver',
  driverId: '12345',
  driverCar: 'Cobalt 01A123BC',
};

console.log('Sending test incoming call via Pusher...');
console.log('Call data:', testCall);

pusher.trigger('calls', 'incoming-call', testCall)
  .then(() => {
    console.log('\n✅ Pusher event sent successfully!');
    console.log('Check browser console for [Pusher] Incoming call log');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Pusher error:', err);
    process.exit(1);
  });
