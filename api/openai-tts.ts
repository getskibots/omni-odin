/**
 * Vercel serverless function — proxies OpenAI Text-to-Speech.
 * Used by the "tap to play" buttons in the Test Voice modal.
 *
 * Browser POSTs { text, voice }
 * Server adds OPENAI_API_KEY, forwards to /v1/audio/speech, returns MP3 binary.
 *
 * Env var required: OPENAI_API_KEY
 */

type Req = {
  method?: string;
  body?: { text?: string; voice?: string };
};
type Res = {
  status: (code: number) => Res;
  setHeader: (name: string, value: string) => void;
  send: (body: string | Buffer) => void;
};

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

  const { text, voice } = req.body ?? {};
  if (!text || !voice) {
    res.status(400).send('text + voice required');
    return;
  }

  try {
    const openAiRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice,
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!openAiRes.ok) {
      const err = await openAiRes.text();
      res.status(openAiRes.status).send(err.slice(0, 500));
      return;
    }

    const arrayBuffer = await openAiRes.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(buf.length));
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).send(`OpenAI upstream error: ${e instanceof Error ? e.message : 'unknown'}`);
  }
}
