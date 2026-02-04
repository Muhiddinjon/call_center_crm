const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function publishTestEvent() {
  try {
    const now = Date.now();
    const testCall = {
      id: 'test-' + now,
      callId: 'call-' + now,
      phoneNumber: '+998901234567',
      internalNumber: '100',
      callType: 'incoming',
      callStart: now,
      isDriver: false,
    };

    const eventId = await redis.xadd('events:stream', '*', {
      type: 'incoming_call',
      data: JSON.stringify(testCall),
      timestamp: now.toString(),
    });

    console.log('Test event published successfully!');
    console.log('Event ID:', eventId);
    console.log('Call data:', JSON.stringify(testCall, null, 2));
    console.log('\nSSE clients should now receive this event.');

  } catch (e) {
    console.error('Error:', e.message);
  }
}

publishTestEvent();
