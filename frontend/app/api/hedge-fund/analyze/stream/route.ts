import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
// A committee run takes minutes, so this must not be pinned to a short
// serverless timeout.
export const maxDuration = 300

const STRATTON_API_URL =
  process.env.STRATTON_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://backend-jet-mu-37.vercel.app'

/**
 * Pass-through proxy for the engine's Server-Sent Events stream.
 *
 * The body is piped rather than buffered — buffering would defeat the point,
 * which is that each agent's verdict reaches the page as soon as it lands.
 */
export async function POST(req: NextRequest) {
  const body = await req.text()

  try {
    const upstream = await fetch(`${STRATTON_API_URL}/api/stratton/analyze/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body,
      // @ts-expect-error - Node fetch accepts duplex for streaming responses
      duplex: 'half',
    })

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '')
      return new Response(
        `data: ${JSON.stringify({
          type: 'error',
          message: detail || `Analysis engine returned ${upstream.status}.`,
        })}\n\n`,
        { status: 200, headers: sseHeaders() },
      )
    }

    return new Response(upstream.body, { status: 200, headers: sseHeaders() })
  } catch (error: any) {
    return new Response(
      `data: ${JSON.stringify({
        type: 'error',
        message: `Cannot reach the analysis engine at ${STRATTON_API_URL}. Start the backend with: uvicorn app.main:app --port 8000. Detail: ${error.message}`,
      })}\n\n`,
      { status: 200, headers: sseHeaders() },
    )
  }
}

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}
