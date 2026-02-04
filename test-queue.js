const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function publish(phone, name) {
  const now = Date.now();
  const testCall = {
    id: 'test-' + now,
    callId: 'call-' + now,
    phoneNumber: phone,
    internalNumber: '100',
    callType: 'incoming',
    callStart: now,
    isDriver: name ? true : false,
    driverName: name || undefined,
  };

  await redis.xadd('events:stream', '*', {
    type: 'incoming_call',
    data: JSON.stringify(testCall),
    timestamp: now.toString(),
  });
  console.log('Published:', phone, name || '(client)');
}

async function run() {
  await publish('+998901111111', 'Alisher Driver');
  await new Promise(r => setTimeout(r, 500));
  await publish('+998902222222', null);
  await new Promise(r => setTimeout(r, 500));
  await publish('+998903333333', 'Bobur Driver');
  console.log('\nDone! Check browser for 3 incoming calls in the queue');
}

run();
