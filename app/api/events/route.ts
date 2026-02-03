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
      // Send initial connected message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      );

      let lastEventId = '0';
      let isRunning = true;

      const pollEvents = async () => {
        while (isRunning) {
          try {
            const events = await getRecentEvents(lastEventId);

            for (const event of events) {
              lastEventId = event.id;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              );
            }

            // Send keep-alive ping
            controller.enqueue(encoder.encode(`: ping\n\n`));

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error('SSE error:', error);
            isRunning = false;
            controller.close();
          }
        }
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        isRunning = false;
      });

      pollEvents();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
