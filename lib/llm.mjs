import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROMPT_PATH = join(process.cwd(), 'agent', 'generation-system.txt');

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const ANTHROPIC_MODEL =
  process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

let cachedPrompt;

export function getSystemPrompt() {
  if (cachedPrompt) return cachedPrompt;
  try {
    cachedPrompt = readFileSync(PROMPT_PATH, 'utf8').trim();
  } catch {
    cachedPrompt =
      '思考のデッサン会の自己紹介カードを生成するアシスタント。断定を避け、話しかけやすい表現に。';
  }
  return cachedPrompt;
}

function readKey(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

/** OpenAIキー（OPENAI_API_KEY、または誤って ANTHROPIC_API_KEY に入れた sk- キー） */
export function getOpenAIKey() {
  const direct = readKey('OPENAI_API_KEY');
  if (direct) return direct;

  const misplaced = readKey('ANTHROPIC_API_KEY') || readKey('ANTHROPIC_API_TOKEN');
  if (misplaced && misplaced.startsWith('sk-') && !misplaced.startsWith('sk-ant-')) {
    return misplaced;
  }
  return '';
}

/** Anthropicキー（sk-ant- で始まるもののみ） */
export function getAnthropicKey() {
  const key = readKey('ANTHROPIC_API_KEY') || readKey('ANTHROPIC_API_TOKEN');
  if (key && key.startsWith('sk-ant-')) return key;
  return '';
}

export function resolveProvider() {
  const forced = readKey('AI_PROVIDER').toLowerCase();
  if (forced === 'openai') return getOpenAIKey() ? 'openai' : null;
  if (forced === 'anthropic') return getAnthropicKey() ? 'anthropic' : null;

  if (getOpenAIKey()) return 'openai';
  if (getAnthropicKey()) return 'anthropic';
  return null;
}

export function getModelForProvider(provider) {
  if (provider === 'openai') return OPENAI_MODEL;
  if (provider === 'anthropic') return ANTHROPIC_MODEL;
  return 'unknown';
}

/** @param {import('@anthropic-ai/sdk').Anthropic.Messages.Message} resp */
function extractAnthropicText(resp) {
  /** @type {string[]} */
  const parts = [];
  for (const b of resp.content ?? []) {
    if (b.type === 'text' && typeof b.text === 'string') {
      parts.push(b.text);
    }
  }
  return parts.join('');
}

async function generateWithOpenAI(answersText) {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error(
      'SERVER_NOT_CONFIGURED: OPENAI_API_KEY が未設定です。環境変数にキーをセットしてください。',
    );
  }

  const systemPrompt = getSystemPrompt();
  const userMessage = `以下のインタビュー回答をもとに、自己紹介カードとファシリテーター集約用メモを生成してください。

${answersText.trim()}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err =
      payload && typeof payload === 'object' && 'error' in payload &&
      payload.error && typeof payload.error === 'object' && 'message' in payload.error
        ? String(payload.error.message)
        : `OpenAI API error (${res.status})`;
    throw new Error(err);
  }

  const markdown =
    payload?.choices?.[0]?.message?.content != null ?
      String(payload.choices[0].message.content)
    : '';

  return {
    markdown,
    usage: payload.usage ?? null,
    stopReason: payload.choices?.[0]?.finish_reason ?? null,
  };
}

async function generateWithAnthropic(answersText) {
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    throw new Error(
      'SERVER_NOT_CONFIGURED: ANTHROPIC_API_KEY が未設定です。環境変数にキーをセットしてください。',
    );
  }

  const anthropic = new Anthropic({ apiKey });
  const userMessage = `以下のインタビュー回答をもとに、自己紹介カードとファシリテーター集約用メモを生成してください。

${answersText.trim()}`;

  const completion = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    system: getSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userMessage }],
      },
    ],
  });

  return {
    markdown: extractAnthropicText(completion),
    usage: completion.usage ?? null,
    stopReason: completion.stop_reason ?? null,
  };
}

export async function generateCardMarkdown(answersText) {
  const provider = resolveProvider();
  if (provider === 'openai') return generateWithOpenAI(answersText);
  if (provider === 'anthropic') return generateWithAnthropic(answersText);

  throw new Error(
    'SERVER_NOT_CONFIGURED: OPENAI_API_KEY または ANTHROPIC_API_KEY を環境変数にセットしてください。',
  );
}

export function getHealthPayload() {
  const provider = resolveProvider();
  const systemPrompt = getSystemPrompt();
  const hasApiKey = Boolean(provider);

  return {
    ok: true,
    provider,
    hasApiKey,
    /** 後方互換 */
    hasAnthropicKey: provider === 'anthropic',
    model: getModelForProvider(provider),
    promptChars: systemPrompt.length,
  };
}
