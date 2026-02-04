const Pusher = require('pusher');
require('dotenv').config({ path: '.env.local' });

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});

const testCalls = [
  {
    id: `test-1-${Date.now()}`,
    callId: `binotel-1-${Date.now()}`,
    phoneNumber: '+998901111111',
    callType: 'incoming',
    callStart: Date.now(),
    isDriver: true,
    driverName: 'Alisher Karimov',
    driverId: '1001',
    driverCar: 'Nexia 01A111AA',
  },
  {
    id: `test-2-${Date.now()}`,
    callId: `binotel-2-${Date.now()}`,
    phoneNumber: '+998902222222',
    callType: 'incoming',
    callStart: Date.now(),
    isDriver: false,
  },
  {
    id: `test-3-${Date.now()}`,
    callId: `binotel-3-${Date.now()}`,
    phoneNumber: '+998903333333',
    callType: 'incoming',
    callStart: Date.now(),
    isDriver: true,
    driverName: 'Bobur Toshmatov',
    driverId: '2002',
    driverCar: 'Cobalt 95B222BB',
  },
];

async function sendCalls() {
  console.log('Sending 3 incoming calls...\n');

  for (let i = 0; i < testCalls.length; i++) {
    const call = testCalls[i];
    console.log(`[${i + 1}] Sending: ${call.phoneNumber} ${call.driverName || '(client)'}`);
    await pusher.trigger('calls', 'incoming-call', call);
    await new Promise(r => setTimeout(r, 500)); // 500ms delay between calls
  }

  console.log('\n✅ All 3 calls sent!');
  console.log('You should see 3 cards in the incoming calls list');
}

sendCalls().then(() => process.exit(0));
