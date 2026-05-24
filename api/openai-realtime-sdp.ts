/**
 * Vercel serverless function — proxies the OpenAI Realtime SDP exchange.
 *
 * Flow:
 *   1. Browser opens a WebRTC peer connection and creates an SDP offer.
 *   2. Browser POSTs the SDP body to /api/openai-realtime-sdp (this function).
 *   3. This function forwards the SDP to OpenAI with the server-side API key.
 *   4. Returns OpenAI's SDP answer to the browser as text/plain.
 *
 * The key never leaves the server. Browser code never sees OPENAI_API_KEY.
 *
 * Env var required: OPENAI_API_KEY  (set in Vercel dashboard → Settings → Env Vars)
 */

const REALTIME_MODEL = 'gpt-realtime';

export const config = {
  api: {
    bodyParser: false, // we want the raw SDP body, not parsed JSON
  },
};

// Vercel-compatible request/response. Types are loose to avoid needing @vercel/node.
// In a Node serverless function, req/res are Node IncomingMessage / ServerResponse.
type Req = { method?: string; on: (e: string, cb: (chunk: Buffer) => void) => void };
type Res = {
  status: (code: number) => Res;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
  end: (body?: string) => void;
};

async function readRawBody(req: Req): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', (err: Error) => reject(err));
  });
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).send('Server misconfigured: OPENAI_API_KEY missing');
    return;
  }

  let sdp: string;
  try {
    sdp = await readRawBody(req);
  } catch (e) {
    res.status(400).send(`Failed to read SDP body: ${e instanceof Error ? e.message : 'unknown'}`);
    return;
  }
  if (!sdp || sdp.length < 20) {
    res.status(400).send('SDP body missing or too short');
    return;
  }

  try {
    const openAiRes = await fetch(
      `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(
        REALTIME_MODEL,
      )}&session.type=realtime`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/sdp',
        },
        body: sdp,
      },
    );

    const answer = await openAiRes.text();

    if (!openAiRes.ok) {
      res.status(openAiRes.status).send(answer.slice(0, 1000));
      return;
    }

    res.setHeader('Content-Type', 'application/sdp');
    res.status(200).send(answer);
  } catch (e) {
    res.status(502).send(`OpenAI upstream error: ${e instanceof Error ? e.message : 'unknown'}`);
  }
}
