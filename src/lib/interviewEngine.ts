import {
  DEMO_COMPLETE_MESSAGE,
  DEMO_INTRO_MESSAGE,
  DEMO_SCENES,
  DEMO_STEP_HINTS,
  Q1_MOODS,
  Q2_OPTIONS,
  Q5_OPTIONS,
  Q6_OPTIONS,
  Q5_PICK_MORE,
  Q6_PICK_MORE,
  Q6_TOPIC_PROMPT,
  WELCOME_MESSAGE,
  BEFORE_OUTPUT_MESSAGE,
} from './interviewConfig';

export type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

export type QuickReply = {
  id: string;
  label: string;
};

export type InterviewAnswers = {
  q1: {
    name: string;
    mood: string;
    moodLabel: string;
    deepdive?: string;
  };
  q2: {
    choice: string;
    choiceLabel: string;
    freeText?: string;
    deepdive?: string;
  };
  q3: {
    text: string;
    deepdive?: string;
  };
  q4: {
    text: string;
    deepdive?: string;
  };
  q5: {
    choices: Array<{ id: string; label: string }>;
    freeText?: string;
    deepdive?: string;
  };
  q6: {
    choices: Array<{ id: string; label: string }>;
    topic: string;
    deepdive?: string;
  };
  demoScene?: string;
};

export type InterviewPhase =
  | 'welcome'
  | 'demo_intro'
  | 'demo_scene'
  | 'q1_name'
  | 'q1_mood'
  | 'q1_deepdive'
  | 'q2'
  | 'q2_deepdive'
  | 'q3'
  | 'q3_deepdive'
  | 'q4'
  | 'q4_deepdive'
  | 'q5'
  | 'q5_pick_more'
  | 'q5_deepdive'
  | 'q6'
  | 'q6_pick_more'
  | 'q6_topic'
  | 'q6_deepdive'
  | 'generating'
  | 'complete'
  | 'demo_complete';

export type InterviewState = {
  phase: InterviewPhase;
  isDemoMode: boolean;
  messages: ChatMessage[];
  answers: Partial<InterviewAnswers>;
  quickReplies: QuickReply[];
  awaitingTextInput: boolean;
  textInputPlaceholder: string;
  showNameInput: boolean;
  lastCompletedQuestion: number;
};

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}_${Math.random()}`;
  }
}

function assistant(text: string): ChatMessage {
  return { id: uid(), role: 'assistant', text };
}

function user(text: string): ChatMessage {
  return { id: uid(), role: 'user', text };
}

/** 短い・曖昧な回答かどうか（深掘り判断） */
export function needsDeepDive(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length <= 3) return true;
  if (/^[0-9０-９]+$/.test(t)) return true;
  if (/^(はい|いいえ|うん|ええ|そう|ない|わからない|特になし|なし)$/i.test(t)) return true;
  if (t.split(/\s+/).length === 1 && t.length < 8) return true;
  return false;
}

function demoLeadText(qNum: number): string {
  const hint = DEMO_STEP_HINTS[qNum];
  if (!hint) return '';
  return `【お試しモード】ここまで完了！

いい感じです！${hint.got}が伝わってきました。

次は、${hint.nextPurpose}を聞いていきます。
このステップでは、${hint.nextValue}が自己紹介カードに反映されます。

それでは、次の質問へ進みましょう。`;
}

function withDemoLead(state: InterviewState, qNum: number, nextMessages: ChatMessage[]): ChatMessage[] {
  if (!state.isDemoMode || qNum <= 0) return nextMessages;
  return [assistant(demoLeadText(qNum)), ...nextMessages];
}

function q1Message(): string {
  return `質問 1 / 6

今日、どんな名前で呼ばれたいですか？

あわせて、今の気分に近いものを1つ選んでもらえますか？

1. ワクワク
2. 少し緊張
3. 様子見
4. 楽しみ半分・不安半分
5. まだよくわからない
6. その他（自分の言葉で）

名前をテキストで入力してから、気分を下のボタンで選んでください 😊`;
}

function q2Message(): string {
  return `ありがとうございます 😊

質問 2 / 6

ここ1〜2週間で、なんとなくよく見ているもの・聞いているもの・触れているものはありますか？

まず、近いものを1つ選んでみてください。

1. 動画・SNS
2. 音楽・ラジオ・ポッドキャスト
3. 映画・ドラマ・アニメ・本・漫画
4. ゲーム・アプリ
5. 食べ物・お店・場所
6. 散歩・運動・生活習慣
7. 特に思いつかない

選べそうであれば、下のボタンから1つ選んでください。`;
}

function q3Message(): string {
  return `質問 3 / 6

最近、仕事や日常の中で「ちょっと気になった」「少し引っかかった」ことはありますか？

大きなニュースや立派な問題意識でなくて大丈夫です。たとえば…

- 誰かの発言で気になったこと
- 仕事や生活の中の小さな違和感
- 最近見た作品や投稿で考えたこと
- 便利だけど少し怖いと思ったこと
- なんとなくモヤモヤしていること

思いつくことがあれば、ひとつ教えてください。`;
}

function q4Message(): string {
  return `質問 4 / 6

仕事でも日常でも、最近「自分が少し役に立ったかも」と思う場面はありますか？

大きな成果でなくて大丈夫です。たとえば…

- 誰かの話を聞いた
- 情報を整理した
- 説明した
- 間に入った
- 場を和らげた
- 何かを決める手伝いをした
- こっそり支えた

思いつく場面があれば、ひとつ教えてください。`;
}

function q5Message(): string {
  return `質問 5 / 6

何かを進めるとき、気づくと気にしていることに近いものはどれですか？ 当てはまるものを1〜2個選んでください。

1. 人が置いていかれていないか
2. 話の筋が通っているか
3. 目的と手段がずれていないか
4. 言葉がちゃんと伝わるか
5. 見た目や雰囲気がしっくり来るか
6. リスクや抜け漏れがないか
7. 面白くなる余地があるか
8. 現場で本当に使えるか
9. その他（自分の言葉で）

1〜2個、下のボタンで選んでください。`;
}

function q6Message(): string {
  return `質問 6 / 6

最後の質問です 😊

普段AIを使う場面に近いものはありますか？ 当てはまるものを1〜2個選んでください。

1. 調べもの
2. 文章作成
3. アイデア出し
4. 仕事の効率化
5. 思考や感情の整理
6. 画像・音楽・小説などの創作
7. 勉強・語学
8. ほとんど使っていない
9. 使ってみたいが、まだ距離がある

1〜2個、下のボタンで選んでください。`;
}

export function createInitialState(): InterviewState {
  return {
    phase: 'welcome',
    isDemoMode: false,
    messages: [assistant(WELCOME_MESSAGE)],
    answers: {},
    quickReplies: [
      { id: 'start', label: 'はじめる' },
      { id: 'demo', label: 'お試しモードを試す' },
    ],
    awaitingTextInput: false,
    textInputPlaceholder: '',
    showNameInput: false,
    lastCompletedQuestion: 0,
  };
}

function moodReplies(): QuickReply[] {
  return Q1_MOODS.map((m) => ({ id: m.id, label: m.label }));
}

function optionReplies(options: ReadonlyArray<{ id: string; label: string }>): QuickReply[] {
  return options.map((o) => ({ id: o.id, label: o.label }));
}

export function reduceInterview(
  state: InterviewState,
  action:
    | { type: 'quick_reply'; replyId: string; label: string }
    | { type: 'text'; text: string }
    | { type: 'reset' },
): InterviewState {
  if (action.type === 'reset') {
    return createInitialState();
  }

  const text = action.type === 'text' ? action.text.trim() : '';
  const replyId = action.type === 'quick_reply' ? action.replyId : '';
  const replyLabel = action.type === 'quick_reply' ? action.label : '';

  if (action.type === 'text' && !text) {
    return {
      ...state,
      messages: [...state.messages, assistant('うまく受け取れなかったようです。もう一度教えてもらえますか？')],
    };
  }

  const newMessages = [...state.messages];
  if (action.type === 'quick_reply') {
    newMessages.push(user(replyLabel));
  } else {
    newMessages.push(user(text));
  }

  const base = { ...state, messages: newMessages };

  switch (state.phase) {
    case 'welcome':
      if (replyId === 'demo') {
        return {
          ...base,
          phase: 'demo_intro',
          isDemoMode: true,
          messages: [...newMessages, assistant(DEMO_INTRO_MESSAGE)],
          quickReplies: DEMO_SCENES.map((s) => ({ id: s.id, label: s.label })),
          awaitingTextInput: false,
          showNameInput: false,
        };
      }
      if (replyId === 'start') {
        return {
          ...base,
          phase: 'q1_name',
          messages: [
            ...newMessages,
            assistant('ありがとうございます！では早速はじめましょう 😊'),
            assistant(q1Message()),
          ],
          quickReplies: moodReplies(),
          awaitingTextInput: false,
          showNameInput: true,
          textInputPlaceholder: '呼ばれたい名前を入力…',
        };
      }
      return state;

    case 'demo_intro':
      return {
        ...base,
        phase: 'q1_name',
        isDemoMode: true,
        answers: { ...base.answers, demoScene: replyLabel },
        messages: [
          ...newMessages,
          assistant('ありがとうございます！では体験を始めましょう 😊'),
          assistant(q1Message()),
        ],
        quickReplies: moodReplies(),
        awaitingTextInput: false,
        showNameInput: true,
        textInputPlaceholder: '呼ばれたい名前を入力…',
      };

    case 'q1_name':
      if (action.type !== 'text') return state;
      const name = text;
      return {
        ...base,
        phase: 'q1_mood',
        answers: {
          ...base.answers,
          q1: { name, mood: '', moodLabel: '' },
        },
        quickReplies: moodReplies(),
        showNameInput: false,
        awaitingTextInput: false,
        messages: [
          ...newMessages,
          assistant(`${name}さん、ありがとうございます！気分は下のボタンから1つ選んでください 😊`),
        ],
      };

    case 'q1_mood':
      const q1 = base.answers.q1 ?? { name: '', mood: '', moodLabel: '' };
      const moodLabel = replyLabel;
      const moodId = replyId;
      const q1Complete = { ...q1, mood: moodId, moodLabel };

      if (moodId === '6' && action.type === 'quick_reply') {
        return {
          ...base,
          phase: 'q1_mood',
          answers: { ...base.answers, q1: { ...q1Complete, moodLabel: 'その他' } },
          quickReplies: [],
          awaitingTextInput: true,
          showNameInput: false,
          textInputPlaceholder: '今の気分を自分の言葉で…',
        };
      }

      if (q1Complete.moodLabel === 'その他' && action.type === 'text') {
        q1Complete.moodLabel = text;
      }

      if (needsDeepDive(q1Complete.moodLabel) || (q1Complete.moodLabel === 'その他' && text.length < 5)) {
        return {
          ...base,
          phase: 'q1_deepdive',
          answers: { ...base.answers, q1: q1Complete },
          quickReplies: [],
          awaitingTextInput: true,
          showNameInput: false,
          textInputPlaceholder: 'ひとことで大丈夫ですよ…',
          messages: [
            ...newMessages,
            assistant(
              `${q1Complete.name}さん、ありがとうございます！\n\nその気分は、今日のどんなところから来ていますか？ 思いつくことがあれば、ひとことで大丈夫ですよ。`,
            ),
          ],
        };
      }

      return advanceToQ2(base, q1Complete, 1);

    case 'q1_deepdive':
      const q1Final = { ...(base.answers.q1 ?? { name: '', mood: '', moodLabel: '' }), deepdive: text };
      return advanceToQ2(base, q1Final, 1);

    case 'q2':
      if (replyId === '9' || replyLabel.includes('その他')) {
        return {
          ...base,
          phase: 'q2',
          answers: {
            ...base.answers,
            q2: { choice: replyId, choiceLabel: replyLabel },
          },
          quickReplies: [],
          awaitingTextInput: true,
          textInputPlaceholder: '自分の言葉で教えてください…',
        };
      }
      const q2Data = { choice: replyId, choiceLabel: replyLabel };
      if (needsDeepDive(replyLabel)) {
        return {
          ...base,
          phase: 'q2_deepdive',
          answers: { ...base.answers, q2: q2Data },
          quickReplies: [],
          awaitingTextInput: true,
          textInputPlaceholder: 'ひとことで大丈夫ですよ…',
          messages: [
            ...newMessages,
            assistant('それは、どんな気分のときに触れることが多いですか？ ひとことで大丈夫ですよ。'),
          ],
        };
      }
      return advanceToQ3(base, q2Data, 2);

    case 'q2_deepdive':
      const q2Final = {
        ...(base.answers.q2 ?? { choice: '', choiceLabel: '' }),
        deepdive: text,
      };
      return advanceToQ3(base, q2Final, 2);

    case 'q3':
      const q3Data = { text };
      if (needsDeepDive(text)) {
        return {
          ...base,
          phase: 'q3_deepdive',
          answers: { ...base.answers, q3: q3Data },
          quickReplies: [],
          awaitingTextInput: true,
          textInputPlaceholder: 'ひとことで大丈夫ですよ…',
          messages: [
            ...newMessages,
            assistant('その中で、いちばん残っているのはどの部分ですか？ ひとことで大丈夫ですよ。'),
          ],
        };
      }
      return advanceToQ4(base, q3Data, 3);

    case 'q3_deepdive':
      return advanceToQ4(base, { ...(base.answers.q3 ?? { text: '' }), deepdive: text }, 3);

    case 'q4':
      const q4Data = { text };
      if (needsDeepDive(text)) {
        return {
          ...base,
          phase: 'q4_deepdive',
          answers: { ...base.answers, q4: q4Data },
          quickReplies: [],
          awaitingTextInput: true,
          textInputPlaceholder: 'ひとことで大丈夫ですよ…',
          messages: [
            ...newMessages,
            assistant('その場面で、自分は何を気にして動いていましたか？ ひとことで大丈夫ですよ。'),
          ],
        };
      }
      return advanceToQ5(base, q4Data, 4);

    case 'q4_deepdive':
      return advanceToQ5(base, { ...(base.answers.q4 ?? { text: '' }), deepdive: text }, 4);

    case 'q5':
      if (action.type === 'text') {
        return handleQ5FreeText(state, text);
      }
      if (replyId === '9') {
        return {
          ...base,
          phase: 'q5',
          answers: {
            ...base.answers,
            q5: { choices: [{ id: replyId, label: replyLabel }] },
          },
          quickReplies: [],
          awaitingTextInput: true,
          textInputPlaceholder: '自分の言葉で教えてください…',
        };
      }
      const q5First = { choices: [{ id: replyId, label: replyLabel }] };
      return {
        ...base,
        phase: 'q5_pick_more',
        answers: { ...base.answers, q5: q5First },
        quickReplies: optionReplies(Q5_OPTIONS.filter((o) => o.id !== replyId)),
        awaitingTextInput: true,
        textInputPlaceholder: '「これだけ」と送るか、もう1つ選んでください',
        messages: [...newMessages, assistant(Q5_PICK_MORE)],
      };

    case 'q5_pick_more':
      const existingQ5 = base.answers.q5 ?? { choices: [] };
      let q5Result = { ...existingQ5 };

      if (action.type === 'text' && (text === 'これだけ' || text === 'これで' || text === 'OK')) {
        // proceed
      } else if (action.type === 'quick_reply') {
        q5Result = {
          ...existingQ5,
          choices: [...existingQ5.choices, { id: replyId, label: replyLabel }],
        };
      } else if (action.type === 'text' && existingQ5.choices.some((c) => c.id === '9')) {
        q5Result = { ...existingQ5, freeText: text };
      } else if (action.type === 'text') {
        return base;
      }

      const q5Labels = q5Result.choices.map((c) => c.label).join('、');
      if (needsDeepDive(q5Labels)) {
        return {
          ...base,
          phase: 'q5_deepdive',
          answers: { ...base.answers, q5: q5Result },
          quickReplies: [],
          awaitingTextInput: true,
          textInputPlaceholder: 'ひとことで大丈夫ですよ…',
          messages: [
            ...newMessages,
            assistant('それを気にするのは、どんな場面で出やすいですか？ ひとことで大丈夫ですよ。'),
          ],
        };
      }
      return advanceToQ6(base, q5Result, 5);

    case 'q5_deepdive':
      const q5Final = {
        ...(base.answers.q5 ?? { choices: [] }),
        deepdive: text,
      };
      return advanceToQ6(base, q5Final, 5);

    case 'q6':
      if (action.type === 'text') {
        const existing = base.answers.q6;
        if (existing?.choices.some((c) => c.id === '9') && !existing.topic) {
          return {
            ...base,
            phase: 'q6_pick_more',
            answers: {
              ...base.answers,
              q6: { ...existing, choices: [{ id: '9', label: text }] },
            },
            quickReplies: optionReplies(Q6_OPTIONS.filter((o) => o.id !== '9')),
            awaitingTextInput: true,
            textInputPlaceholder: '「これだけ」と送るか、もう1つ選んでください',
            messages: [...newMessages, assistant(Q6_PICK_MORE)],
          };
        }
        return base;
      }
      if (replyId === '9') {
        return {
          ...base,
          phase: 'q6',
          answers: {
            ...base.answers,
            q6: { choices: [{ id: replyId, label: replyLabel }], topic: '' },
          },
          quickReplies: [],
          awaitingTextInput: true,
          textInputPlaceholder: '自分の言葉で教えてください…',
        };
      }
      const q6First = { choices: [{ id: replyId, label: replyLabel }], topic: '' };
      return {
        ...base,
        phase: 'q6_pick_more',
        answers: { ...base.answers, q6: q6First },
        quickReplies: optionReplies(Q6_OPTIONS.filter((o) => o.id !== replyId)),
        awaitingTextInput: true,
        textInputPlaceholder: '「これだけ」と送るか、もう1つ選んでください',
        messages: [...newMessages, assistant(Q6_PICK_MORE)],
      };

    case 'q6_pick_more':
      const existingQ6 = base.answers.q6 ?? { choices: [], topic: '' };
      let q6Partial = { ...existingQ6 };

      if (action.type === 'text' && (text === 'これだけ' || text === 'これで' || text === 'OK')) {
        // proceed to topic
      } else if (action.type === 'quick_reply') {
        q6Partial = {
          ...existingQ6,
          choices: [...existingQ6.choices, { id: replyId, label: replyLabel }],
        };
      } else if (action.type === 'text' && existingQ6.choices.some((c) => c.id === '9')) {
        q6Partial = { ...existingQ6, choices: existingQ6.choices };
        // free text for その他 - store in topic temporarily? use freeText field
      } else if (action.type === 'text') {
        return base;
      }

      return {
        ...base,
        phase: 'q6_topic',
        answers: { ...base.answers, q6: q6Partial },
        quickReplies: [],
        awaitingTextInput: true,
        showNameInput: false,
        textInputPlaceholder: '今日話してみたいテーマ…',
        messages: [...newMessages, assistant(Q6_TOPIC_PROMPT)],
      };

    case 'q6_topic':
      const q6WithTopic = {
        ...(base.answers.q6 ?? { choices: [], topic: '' }),
        topic: text,
      };
      if (needsDeepDive(text)) {
        return {
          ...base,
          phase: 'q6_deepdive',
          answers: { ...base.answers, q6: q6WithTopic },
          quickReplies: [],
          awaitingTextInput: true,
          textInputPlaceholder: 'ひとことで大丈夫ですよ…',
          messages: [
            ...newMessages,
            assistant(
              'その使い方について、便利だと思う点や少し気になる点はありますか？ ひとことで大丈夫ですよ。',
            ),
          ],
        };
      }
      return finishInterview(base, q6WithTopic);

    case 'q6_deepdive':
      const q6Final = {
        ...(base.answers.q6 ?? { choices: [], topic: '' }),
        deepdive: text,
      };
      return finishInterview(base, q6Final);

    default:
      return state;
  }
}

function advanceToQ2(state: InterviewState, q1: InterviewAnswers['q1'], completedQ: number): InterviewState {
  const msgs = withDemoLead(state, completedQ, [assistant(q2Message())]);
  return {
    ...state,
    phase: 'q2',
    answers: { ...state.answers, q1 },
    messages: [...state.messages, ...msgs],
    quickReplies: optionReplies(Q2_OPTIONS),
    awaitingTextInput: false,
    showNameInput: false,
    lastCompletedQuestion: completedQ,
  };
}

function advanceToQ3(state: InterviewState, q2: InterviewAnswers['q2'], completedQ: number): InterviewState {
  const msgs = withDemoLead(state, completedQ, [assistant(q3Message())]);
  return {
    ...state,
    phase: 'q3',
    answers: { ...state.answers, q2 },
    messages: [...state.messages, ...msgs],
    quickReplies: [],
    awaitingTextInput: true,
    textInputPlaceholder: '思いつくことを教えてください…',
    lastCompletedQuestion: completedQ,
  };
}

function advanceToQ4(state: InterviewState, q3: InterviewAnswers['q3'], completedQ: number): InterviewState {
  const msgs = withDemoLead(state, completedQ, [assistant(q4Message())]);
  return {
    ...state,
    phase: 'q4',
    answers: { ...state.answers, q3 },
    messages: [...state.messages, ...msgs],
    quickReplies: [],
    awaitingTextInput: true,
    textInputPlaceholder: '思いつく場面を教えてください…',
    lastCompletedQuestion: completedQ,
  };
}

function advanceToQ5(state: InterviewState, q4: InterviewAnswers['q4'], completedQ: number): InterviewState {
  const msgs = withDemoLead(state, completedQ, [assistant(q5Message())]);
  return {
    ...state,
    phase: 'q5',
    answers: { ...state.answers, q4 },
    messages: [...state.messages, ...msgs],
    quickReplies: optionReplies(Q5_OPTIONS),
    awaitingTextInput: false,
    lastCompletedQuestion: completedQ,
  };
}

function advanceToQ6(state: InterviewState, q5: InterviewAnswers['q5'], completedQ: number): InterviewState {
  const msgs = withDemoLead(state, completedQ, [assistant(q6Message())]);
  return {
    ...state,
    phase: 'q6',
    answers: { ...state.answers, q5 },
    messages: [...state.messages, ...msgs],
    quickReplies: optionReplies(Q6_OPTIONS),
    awaitingTextInput: false,
    lastCompletedQuestion: completedQ,
  };
}

function finishInterview(
  state: InterviewState,
  q6: InterviewAnswers['q6'],
): InterviewState {
  const answers: InterviewAnswers = {
    q1: state.answers.q1!,
    q2: state.answers.q2!,
    q3: state.answers.q3!,
    q4: state.answers.q4!,
    q5: state.answers.q5!,
    q6,
    demoScene: state.answers.demoScene,
  };

  if (state.isDemoMode) {
    return {
      ...state,
      phase: 'demo_complete',
      answers,
      messages: [
        ...state.messages,
        assistant(BEFORE_OUTPUT_MESSAGE),
        assistant(DEMO_COMPLETE_MESSAGE),
      ],
      quickReplies: [{ id: 'start', label: 'はじめる' }],
      awaitingTextInput: false,
      showNameInput: false,
      lastCompletedQuestion: 6,
    };
  }

  return {
    ...state,
    phase: 'generating',
    answers,
    messages: [...state.messages, assistant(BEFORE_OUTPUT_MESSAGE)],
    quickReplies: [],
    awaitingTextInput: false,
    showNameInput: false,
    lastCompletedQuestion: 6,
  };
}

/** q2でテキスト入力（その他）のハンドリング用 */
export function handleQ2FreeText(state: InterviewState, text: string): InterviewState {
  const q2Data = {
    choice: state.answers.q2?.choice ?? '9',
    choiceLabel: text,
    freeText: text,
  };
  const base = {
    ...state,
    messages: [...state.messages, user(text)],
  };
  if (needsDeepDive(text)) {
    return {
      ...base,
      phase: 'q2_deepdive',
      answers: { ...base.answers, q2: q2Data },
      quickReplies: [],
      awaitingTextInput: true,
      textInputPlaceholder: 'ひとことで大丈夫ですよ…',
      messages: [
        ...base.messages,
        assistant('それは、どんな気分のときに触れることが多いですか？ ひとことで大丈夫ですよ。'),
      ],
    };
  }
  return advanceToQ3(base, q2Data, 2);
}

export function handleQ5FreeText(state: InterviewState, text: string): InterviewState {
  const q5Data = {
    choices: state.answers.q5?.choices ?? [{ id: '9', label: 'その他' }],
    freeText: text,
  };
  const base = {
    ...state,
    messages: [...state.messages, user(text)],
  };
  return {
    ...base,
    phase: 'q5_pick_more',
    answers: { ...base.answers, q5: q5Data },
    quickReplies: optionReplies(Q5_OPTIONS.filter((o) => o.id !== '9')),
    awaitingTextInput: true,
    textInputPlaceholder: '「これだけ」と送るか、もう1つ選んでください',
    messages: [...base.messages, assistant(Q5_PICK_MORE)],
  };
}

export function answersToPromptText(answers: InterviewAnswers): string {
  const lines: string[] = [];

  lines.push(`Q1: 名前=${answers.q1.name}, 気分=${answers.q1.moodLabel}`);
  if (answers.q1.deepdive) lines.push(`  Q1深掘り: ${answers.q1.deepdive}`);

  lines.push(`Q2: ${answers.q2.choiceLabel}`);
  if (answers.q2.deepdive) lines.push(`  Q2深掘り: ${answers.q2.deepdive}`);
  if (answers.q2.freeText) lines.push(`  Q2補足: ${answers.q2.freeText}`);

  lines.push(`Q3: ${answers.q3.text}`);
  if (answers.q3.deepdive) lines.push(`  Q3深掘り: ${answers.q3.deepdive}`);

  lines.push(`Q4: ${answers.q4.text}`);
  if (answers.q4.deepdive) lines.push(`  Q4深掘り: ${answers.q4.deepdive}`);

  lines.push(
    `Q5: ${answers.q5.choices.map((c) => c.label).join('、')}`,
  );
  if (answers.q5.freeText) lines.push(`  Q5補足: ${answers.q5.freeText}`);
  if (answers.q5.deepdive) lines.push(`  Q5深掘り: ${answers.q5.deepdive}`);

  lines.push(
    `Q6 AI利用: ${answers.q6.choices.map((c) => c.label).join('、')}`,
  );
  lines.push(`Q6 今日話したいこと: ${answers.q6.topic}`);
  if (answers.q6.deepdive) lines.push(`  Q6深掘り: ${answers.q6.deepdive}`);

  return lines.join('\n');
}
