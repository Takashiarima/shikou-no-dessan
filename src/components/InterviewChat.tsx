import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { InterviewAnswers } from '../lib/interviewEngine';
import {
  createInitialState,
  reduceInterview,
  answersToPromptText,
  getQuickReplyMaxSelections,
  type InterviewState,
  type QuickReplyChoice,
} from '../lib/interviewEngine';
import { fetchHealth, postGenerate, type HealthResponse } from '../lib/api';

type InterviewChatProps = {
  onCardGenerated: (markdown: string) => void;
  onGeneratingChange: (generating: boolean) => void;
};

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
}

export function InterviewChat({ onCardGenerated, onGeneratingChange }: InterviewChatProps) {
  const formId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<InterviewState>(createInitialState);
  const [input, setInput] = useState('');
  const [selectedQuick, setSelectedQuick] = useState<QuickReplyChoice[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const generatingRef = useRef(false);
  const isMac = isMacPlatform();

  const maxQuickSelections = getQuickReplyMaxSelections(state.phase);

  useEffect(() => {
    void fetchHealth()
      .then(setHealth)
      .catch((e: unknown) => {
        setHealthErr(e instanceof Error ? e.message : 'APIに接続できません');
      });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.messages]);

  useEffect(() => {
    setSelectedQuick([]);
  }, [state.phase, state.quickReplies]);

  const runGenerate = useCallback(
    async (answers: InterviewAnswers) => {
      if (generatingRef.current) return;
      generatingRef.current = true;
      onGeneratingChange(true);
      setGenError(null);

      try {
        const text = answersToPromptText(answers);
        const { markdown } = await postGenerate(text);
        onCardGenerated(markdown);
        setState((s) => ({ ...s, phase: 'complete' }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : '生成に失敗しました';
        setGenError(msg);
        setState((s) => ({
          ...s,
          messages: [...s.messages, { id: crypto.randomUUID(), role: 'assistant', text: `少し問題が起きてしまいました。${msg}` }],
        }));
      } finally {
        generatingRef.current = false;
        onGeneratingChange(false);
      }
    },
    [onCardGenerated, onGeneratingChange],
  );

  useEffect(() => {
    if (state.phase === 'generating' && state.answers.q1) {
      const answers = state.answers as InterviewAnswers;
      void runGenerate(answers);
    }
  }, [state.phase, state.answers, runGenerate]);

  const toggleQuickReply = (id: string, label: string) => {
    const exists = selectedQuick.some((s) => s.id === id);
    if (exists) {
      setSelectedQuick(selectedQuick.filter((s) => s.id !== id));
      return;
    }
    if (maxQuickSelections === 1) {
      setSelectedQuick([{ id, label }]);
      return;
    }
    if (selectedQuick.length < maxQuickSelections) {
      setSelectedQuick([...selectedQuick, { id, label }]);
    }
  };

  const confirmQuickReplies = () => {
    if (selectedQuick.length === 0 || state.phase === 'generating') return;
    setState((s) => reduceInterview(s, { type: 'confirm_quick_replies', choices: selectedQuick }));
    setSelectedQuick([]);
  };

  const submitText = () => {
    const text = input.trim();
    if (!text) return;

    if (state.showNameInput) {
      setState((s) => reduceInterview(s, { type: 'text', text }));
      setInput('');
      return;
    }

    if (!state.awaitingTextInput && !state.showNameInput) return;

    setState((s) => reduceInterview(s, { type: 'text', text }));
    setInput('');
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitText();
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    const shouldSubmit = isMac ? e.metaKey : e.ctrlKey;
    if (shouldSubmit) {
      e.preventDefault();
      submitText();
    }
  };

  const statusText = healthErr
    ? healthErr.slice(0, 80)
    : !health
      ? '接続確認中…'
      : health.hasApiKey
        ? `API接続OK · ${health.provider ?? 'ai'} · ${health.model}`
        : 'APIキー未設定（カード生成不可）';

  const sendShortcutHint = isMac ? '⌘ + Enter で送信' : 'Ctrl + Enter で送信';

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div>
          <h2>インタビュー</h2>
          <p className="chat-sub">全6問 · 5〜7分</p>
        </div>
        <span className={`status-pill ${health?.hasApiKey ? 'ok' : 'warn'}`}>{statusText}</span>
      </div>

      <div className="chat-scroll" ref={scrollRef} role="log" aria-live="polite">
        {state.messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            <div className="bubble-inner">{m.text}</div>
          </div>
        ))}
        {state.phase === 'generating' && (
          <div className="bubble assistant">
            <div className="bubble-inner generating-pulse">カードを生成しています…</div>
          </div>
        )}
      </div>

      {genError && <p className="chat-error" role="alert">{genError}</p>}

      {state.quickReplies.length > 0 && (
        <div className="quick-replies-wrap">
          <div className="quick-replies" role="group" aria-label="クイックリプライ">
            {state.quickReplies.map((qr) => {
              const isSelected = selectedQuick.some((s) => s.id === qr.id);
              return (
                <button
                  key={qr.id}
                  type="button"
                  className={`quick-reply-btn${isSelected ? ' selected' : ''}`}
                  onClick={() => toggleQuickReply(qr.id, qr.label)}
                  disabled={state.phase === 'generating'}
                  aria-pressed={isSelected}
                >
                  {qr.label}
                </button>
              );
            })}
          </div>
          <div className="quick-replies-footer">
            {maxQuickSelections > 1 && (
              <span className="quick-replies-count">
                {selectedQuick.length} / {maxQuickSelections} 選択中
              </span>
            )}
            <button
              type="button"
              className="btn-ok"
              onClick={confirmQuickReplies}
              disabled={selectedQuick.length === 0 || state.phase === 'generating'}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {(state.awaitingTextInput || state.showNameInput) && state.phase !== 'generating' && (
        <form className="chat-form" onSubmit={onSubmit} id={formId}>
          <div className="chat-input-wrap">
            <textarea
              className="chat-input chat-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={state.textInputPlaceholder || 'メッセージを入力…'}
              aria-label="メッセージ入力"
              autoComplete="name"
              rows={3}
            />
            <p className="chat-input-hint">{sendShortcutHint} · Enter で改行</p>
          </div>
          <button type="submit" className="btn-send" disabled={!input.trim()}>
            送信
          </button>
        </form>
      )}

      {state.phase === 'complete' && (
        <div className="chat-done">
          <p>自己紹介カードが右のパネルに表示されています ✨</p>
          <button type="button" className="btn-ghost" onClick={() => { setState(createInitialState()); setInput(''); setSelectedQuick([]); }}>
            最初からやり直す
          </button>
        </div>
      )}
    </div>
  );
}
