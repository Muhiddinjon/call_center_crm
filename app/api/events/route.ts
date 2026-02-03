import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getRecentEvents } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connected message with user info
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', userId: user.userId })}\n\n`)
      );

      // Start from "now" to only get new events, not replay old ones
      // Use current timestamp as the starting point
      let lastEventId = '0';
      let isRunning = true;
      let pollCount = 0;

      const pollEvents = async () => {
        while (isRunning) {
          try {
            const events = await getRecentEvents(lastEventId);
            pollCount++;

            // Log every 30 polls (about every 30 seconds) or when events are found
            if (events.length > 0) {
              console.log(`[SSE] User ${user.username}: ${events.length} events received`);
            }

            for (const event of events) {
              lastEventId = event.id;
              const eventData = JSON.stringify(event);
              controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));

              // Log incoming_call events specifically
              if (event.type === 'incoming_call') {
                console.log(`[SSE] Sending incoming_call to ${user.username}:`, JSON.stringify(event.data).slice(0, 200));
              }
            }

            // Send keep-alive ping every poll
            controller.enqueue(encoder.encode(`: ping ${pollCount}\n\n`));

            // Wait before next poll (1 second for responsive real-time)
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`[SSE] Error for user ${user.username}:`, error);
            // Don't close on error, try to recover
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected: ${user.username}`);
        isRunning = false;
      });

      console.log(`[SSE] Client connected: ${user.username}`);
      pollEvents();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
