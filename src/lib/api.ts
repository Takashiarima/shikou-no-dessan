const base = (): string => import.meta.env.VITE_API_BASE ?? '';

export type HealthResponse = {
  ok: boolean;
  provider: 'openai' | 'anthropic' | null;
  hasApiKey: boolean;
  hasAnthropicKey: boolean;
  model: string;
  promptChars: number;
};

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch(`${base()}/api/health`, { signal });
  const data = (await res.json().catch(() => ({}))) as Partial<HealthResponse>;
  if (!res.ok) {
    throw new Error(`ヘルスチェックが失敗しました (${res.status})`);
  }
  const provider =
    data.provider === 'openai' || data.provider === 'anthropic' ? data.provider : null;
  const hasApiKey = Boolean(data.hasApiKey ?? data.hasAnthropicKey);
  return {
    ok: Boolean(data.ok),
    provider,
    hasApiKey,
    hasAnthropicKey: Boolean(data.hasAnthropicKey),
    model: String(data.model ?? 'unknown'),
    promptChars: Number(data.promptChars ?? 0),
  };
}

export type GenerateReply = {
  markdown: string;
  usage: unknown;
};

export async function postGenerate(
  answersText: string,
  signal?: AbortSignal,
): Promise<GenerateReply> {
  const res = await fetch(`${base()}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ answersText }),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = typeof payload.error === 'string' ? payload.error : `HTTP ${res.status}`;
    throw new Error(err);
  }

  return {
    markdown: String(payload.markdown ?? ''),
    usage: payload.usage ?? null,
  };
}
