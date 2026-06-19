import { generateCardMarkdown } from '../lib/llm.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { answersText } = req.body ?? {};
    if (typeof answersText !== 'string' || !answersText.trim()) {
      res.status(400).json({ error: 'answersText が空または不正です' });
      return;
    }

    const result = await generateCardMarkdown(answersText);
    res.status(200).json(result);
  } catch (e) {
    const msg =
      e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' ?
        e.message
      : String(e);

    const isConfig = msg.includes('SERVER_NOT_CONFIGURED');
    console.error('[api/generate]', msg);
    res.status(isConfig ? 503 : 502).json({ error: msg });
  }
}
