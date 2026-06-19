/**
 * 思考のデッサン会 API — Anthropic proxy
 * 開発: npm run dev:api (PORT 8787)
 * 本番: npm run build && npm start
 */

import Anthropic from '@anthropic-ai/sdk';
import cors from 'cors';
import express from 'express';
import { accessSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, '..', 'agent', 'generation-system.txt');

let systemPrompt;
try {
  systemPrompt = readFileSync(PROMPT_PATH, 'utf8').trim();
} catch {
  systemPrompt = '思考のデッサン会の自己紹介カードを生成するアシスタント。断定を避け、話しかけやすい表現に。';
  console.warn('[dessan] Fallback system prompt');
}

const PORT = Number(process.env.PORT ?? 8787);
const MODEL =
  process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

const corsOriginRaw = process.env.CORS_ORIGIN ?? '';
/** @type {boolean | string | string[]} */
const ALLOWED_ORIGINS =
  !corsOriginRaw.trim() ? true : corsOriginRaw.split(',').map((s) => s.trim());

const apiKey =
  process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_TOKEN || '';

const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

/** @param {import('@anthropic-ai/sdk').Anthropic.Messages.Message} resp */
function extractAssistantText(resp) {
  /** @type {string[]} */
  const parts = [];
  for (const b of resp.content ?? []) {
    if (b.type === 'text' && typeof b.text === 'string') {
      parts.push(b.text);
    }
  }
  return parts.join('');
}

const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
);

app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasAnthropicKey: Boolean(anthropic),
    model: MODEL,
    promptChars: systemPrompt.length,
  });
});

app.post('/api/generate', async (req, res) => {
  try {
    if (!anthropic) {
      res.status(503).json({
        error:
          'SERVER_NOT_CONFIGURED: ANTHROPIC_API_KEY が未設定です。サーバーにキーをセットしてから再起動してください。',
      });
      return;
    }

    const { answersText } = req.body ?? {};
    if (typeof answersText !== 'string' || !answersText.trim()) {
      res.status(400).json({ error: 'answersText が空または不正です' });
      return;
    }

    const userMessage = `以下のインタビュー回答をもとに、自己紹介カードとファシリテーター集約用メモを生成してください。

${answersText.trim()}`;

    const completion = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userMessage }],
        },
      ],
    });

    res.json({
      markdown: extractAssistantText(completion),
      usage: completion.usage ?? null,
      stopReason: completion.stop_reason ?? null,
    });
  } catch (e) {
    const msg =
      e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' ?
        e.message
      : String(e);

    console.error('[api/generate]', msg);
    res.status(502).json({ error: msg });
  }
});

if (process.env.SERVE_STATIC === '1') {
  const distDir = join(__dirname, '..', 'dist');

  try {
    accessSync(distDir);
  } catch {
    console.error('[static] dist が見つかりません。先に npm run build');
    process.exit(1);
  }

  app.use(express.static(distDir));

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    res.sendFile(join(distDir, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

app.listen(PORT, () => {
  console.log(
    `[dessan-api] :${PORT} model=${MODEL} static=${process.env.SERVE_STATIC === '1' ? 'on' : 'off'}`,
  );
});
