import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

const MODEL =
  process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

const PROMPT_PATH = join(process.cwd(), 'agent', 'generation-system.txt');

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

export function getModel() {
  return MODEL;
}

export function getAnthropicClient() {
  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_TOKEN || '';
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

/** @param {import('@anthropic-ai/sdk').Anthropic.Messages.Message} resp */
export function extractAssistantText(resp) {
  /** @type {string[]} */
  const parts = [];
  for (const b of resp.content ?? []) {
    if (b.type === 'text' && typeof b.text === 'string') {
      parts.push(b.text);
    }
  }
  return parts.join('');
}

export async function generateCardMarkdown(answersText) {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    throw new Error(
      'SERVER_NOT_CONFIGURED: ANTHROPIC_API_KEY が未設定です。環境変数にキーをセットしてください。',
    );
  }

  const userMessage = `以下のインタビュー回答をもとに、自己紹介カードとファシリテーター集約用メモを生成してください。

${answersText.trim()}`;

  const completion = await anthropic.messages.create({
    model: MODEL,
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
    markdown: extractAssistantText(completion),
    usage: completion.usage ?? null,
    stopReason: completion.stop_reason ?? null,
  };
}

export function getHealthPayload() {
  const systemPrompt = getSystemPrompt();
  return {
    ok: true,
    hasAnthropicKey: Boolean(getAnthropicClient()),
    model: MODEL,
    promptChars: systemPrompt.length,
  };
}
