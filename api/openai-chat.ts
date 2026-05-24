/**
 * Vercel serverless function — proxies OpenAI Chat Completions.
 * Used by the chat-mode Test AI modal (and chat-completions linting paths).
 *
 * Browser POSTs { messages, model?, max_tokens?, temperature? }
 * Server adds the OPENAI_API_KEY and forwards to api.openai.com.
 *
 * Env var required: OPENAI_API_KEY
 */

type Req = {
  method?: string;
  body?: {
    model?: string;
    messages?: Array<{ role: string; content: string }>;
    max_tokens?: number;
    temperature?: number;
  };
};
type Res = {
  status: (code: number) => Res;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  send: (body: string) => void;
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

  const { messages, model, max_tokens, temperature } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).send('messages[] required');
    return;
  }

  try {
    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model ?? 'gpt-4o-mini',
        messages,
        max_tokens: max_tokens ?? 280,
        temperature: temperature ?? 0.6,
      }),
    });

    const data = await openAiRes.json();
    res.status(openAiRes.ok ? 200 : openAiRes.status).json(data);
  } catch (e) {
    res.status(502).send(`OpenAI upstream error: ${e instanceof Error ? e.message : 'unknown'}`);
  }
}
