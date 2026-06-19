import { useState } from 'react';
import { InterviewChat } from './components/InterviewChat';
import { CanvasPanel } from './components/CanvasPanel';
import './App.css';

export default function App() {
  const [cardMarkdown, setCardMarkdown] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-emoji" aria-hidden>🎨</span>
          <div>
            <h1 className="brand-title">思考のデッサン会</h1>
            <p className="brand-sub">個人用自己紹介カード生成エージェント v1.1</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <InterviewChat
          onCardGenerated={setCardMarkdown}
          onGeneratingChange={setGenerating}
        />
        <CanvasPanel markdown={cardMarkdown} generating={generating} />
      </main>

      <footer className="app-footer">
        話しかけやすい自己紹介カードを、短いインタビューから生成します。APIキーはサーバー側で管理してください。
      </footer>
    </div>
  );
}
