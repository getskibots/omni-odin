/**
 * Vercel serverless function — mints an ElevenLabs Conversational AI signed URL.
 * Used by elevenLabsVoice.ts to start a voice session with a custom voice.
 *
 * Browser POSTs { agent_id } (or sends ?agent_id= as query param)
 * Server adds ELEVENLABS_API_KEY, calls ElevenLabs, returns { signed_url }.
 *
 * Env var required: ELEVENLABS_API_KEY
 */

type Req = {
  method?: string;
  query?: { agent_id?: string };
  body?: { agent_id?: string };
};
type Res = {
  status: (code: number) => Res;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  send: (body: string) => void;
};

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(500).send('Server misconfigured: ELEVENLABS_API_KEY missing');
    return;
  }

  const agentId = req.query?.agent_id ?? req.body?.agent_id;
  if (!agentId || typeof agentId !== 'string') {
    res.status(400).send('agent_id required');
    return;
  }

  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(
        agentId,
      )}`,
      {
        method: 'GET',
        headers: { 'xi-api-key': apiKey },
      },
    );

    const text = await elRes.text();

    if (!elRes.ok) {
      // Forward ElevenLabs error verbatim so the client can show useful diagnostics
      let detail = text.slice(0, 500);
      try {
        const parsed = JSON.parse(text);
        detail = parsed?.detail?.message ?? parsed?.detail ?? parsed?.message ?? detail;
        if (typeof detail !== 'string') detail = JSON.stringify(detail).slice(0, 300);
      } catch {
        /* not JSON */
      }
      res.status(elRes.status).send(`ElevenLabs ${elRes.status}: ${detail}`);
      return;
    }

    const data = JSON.parse(text);
    if (!data?.signed_url) {
      res.status(502).send('ElevenLabs returned no signed_url');
      return;
    }

    res.status(200).json({ signed_url: data.signed_url });
  } catch (e) {
    res.status(502).send(`ElevenLabs upstream error: ${e instanceof Error ? e.message : 'unknown'}`);
  }
}
