const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Test function - get ALL events (not just last 60 seconds)
async function getRecentEvents(lastId = '0') {
  try {
    // Use '-' to get ALL events for testing
    const startId = '-';
    const rawEvents = await redis.xrange('events:stream', startId, '+', 100);

    if (!rawEvents) return [];

    const result = [];

    // Upstash xrange returns OBJECT format: { "id": { type, data, timestamp }, ... }
    if (typeof rawEvents === 'object' && !Array.isArray(rawEvents)) {
      console.log('Detected Upstash OBJECT format');
      for (const [eventId, fields] of Object.entries(rawEvents)) {
        try {
          if (!eventId || !fields || typeof fields !== 'object') continue;

          const eventType = fields.type || 'unknown';
          let eventData = null;

          if (fields.data) {
            try {
              eventData = typeof fields.data === 'string' ? JSON.parse(fields.data) : fields.data;
            } catch {
              eventData = fields.data;
            }
          }

          result.push({ id: eventId, type: eventType, data: eventData });
        } catch (parseError) {
          console.warn('Failed to parse event entry:', parseError);
        }
      }
    } else if (Array.isArray(rawEvents) && rawEvents.length > 0) {
      console.log('Detected standard ARRAY format');
      // Handle standard Redis array format
      for (const entry of rawEvents) {
        // ... handle array format
      }
    }

    return result;
  } catch (error) {
    console.error('getRecentEvents error:', error);
    return [];
  }
}

async function check() {
  try {
    console.log('Testing updated getRecentEvents function...\n');

    // Test our updated function
    const events = await getRecentEvents('0');

    console.log('=== Parsed Events ===');
    console.log('Total events:', events.length);
    console.log('');

    if (events.length > 0) {
      console.log('Last 5 events:');
      events.slice(-5).forEach((event, idx) => {
        console.log(`\n[${idx + 1}] ID: ${event.id}`);
        console.log(`    Type: ${event.type}`);
        console.log(`    Data: ${JSON.stringify(event.data).slice(0, 150)}...`);
      });
    } else {
      console.log('No events found (this is expected if no recent events)');
    }

    // Also check stream length
    const len = await redis.xlen('events:stream');
    console.log('\n\nStream total length:', len);

  } catch (e) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
  }
}

check();
