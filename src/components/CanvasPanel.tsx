import { useMemo, type ReactNode } from 'react';

type CanvasPanelProps = {
  markdown: string | null;
  generating: boolean;
};

/** 簡易Markdown表示（見出し・リスト・区切り線） */
function renderMarkdown(md: string): ReactNode[] {
  const lines = md.split('\n');
  const nodes: ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed === '---') {
      nodes.push(<hr key={i} className="md-hr" />);
      return;
    }

    if (trimmed.startsWith('## ')) {
      nodes.push(<h3 key={i} className="md-h3">{trimmed.slice(3)}</h3>);
      return;
    }

    if (trimmed.startsWith('- ')) {
      nodes.push(
        <p key={i} className="md-li">
          <span className="md-bullet">·</span>
          {trimmed.slice(2)}
        </p>,
      );
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      nodes.push(<p key={i} className="md-ol">{trimmed}</p>);
      return;
    }

    if (!trimmed) {
      nodes.push(<div key={i} className="md-gap" />);
      return;
    }

    nodes.push(<p key={i} className="md-p">{line}</p>);
  });

  return nodes;
}

export function CanvasPanel({ markdown, generating }: CanvasPanelProps) {
  const content = useMemo(() => (markdown ? renderMarkdown(markdown) : null), [markdown]);

  return (
    <div className="canvas-panel">
      <div className="canvas-header">
        <h2>自己紹介カード</h2>
        <p className="canvas-sub">Canvas · ワークショップ用アウトプット</p>
      </div>

      <div className="canvas-body">
        {generating && !markdown && (
          <div className="canvas-empty">
            <div className="canvas-spinner" aria-hidden />
            <p>AIがカードを生成しています…</p>
          </div>
        )}

        {!generating && !markdown && (
          <div className="canvas-empty">
            <div className="canvas-placeholder-icon" aria-hidden>🪪</div>
            <p>インタビューが完了すると、ここに自己紹介カードとファシリテーター集約用メモが表示されます。</p>
          </div>
        )}

        {markdown && (
          <article className="canvas-document">
            {content}
          </article>
        )}
      </div>

      {markdown && (
        <div className="canvas-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = '自己紹介カード.md';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Markdownをダウンロード
          </button>
        </div>
      )}
    </div>
  );
}
