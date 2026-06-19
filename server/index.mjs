/**
 * 思考のデッサン会 API — Anthropic proxy（ローカル開発用）
 * 開発: npm run dev:api (PORT 8787)
 * 本番: npm start または Vercel
 */

import cors from 'cors';
import express from 'express';
import { accessSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { generateCardMarkdown, getHealthPayload } from '../lib/anthropic.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);

const corsOriginRaw = process.env.CORS_ORIGIN ?? '';
/** @type {boolean | string | string[]} */
const ALLOWED_ORIGINS =
  !corsOriginRaw.trim() ? true : corsOriginRaw.split(',').map((s) => s.trim());

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
  res.json(getHealthPayload());
});

app.post('/api/generate', async (req, res) => {
  try {
    const { answersText } = req.body ?? {};
    if (typeof answersText !== 'string' || !answersText.trim()) {
      res.status(400).json({ error: 'answersText が空または不正です' });
      return;
    }

    const result = await generateCardMarkdown(answersText);
    res.json(result);
  } catch (e) {
    const msg =
      e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' ?
        e.message
      : String(e);

    const isConfig = msg.includes('SERVER_NOT_CONFIGURED');
    console.error('[api/generate]', msg);
    res.status(isConfig ? 503 : 502).json({ error: msg });
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
    `[dessan-api] :${PORT} static=${process.env.SERVE_STATIC === '1' ? 'on' : 'off'}`,
  );
});
