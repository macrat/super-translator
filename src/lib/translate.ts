import { tokenLimits } from './models';
import count from './tokenizer';

export interface CountTokensOptions {
  input: string;
  from: string;
  to: string;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function buildMessages({ input, from, to }: CountTokensOptions): Message[] {
  return [
    {
      role: 'system',
      content: 'Convert source to target. Use the same language as source if the language is not specified.',
    },
    {
      role: 'user',
      content: 'source: auto\noutput: Python\n\n###\n\nfunction greeting() {\n  console.log("hello");\n}',
    },
    {
      role: 'assistant',
      content: 'def greeting():\n    print("hello")',
    },
    {
      role: 'user',
      content: `source: ${from.trim()}\noutput: ${to.trim()}\n\n###\n\n${input}`,
    }
  ];
}

export function countTokens(opts: CountTokensOptions): number {
  return count(buildMessages(opts));
}

export interface TranslateOptions extends CountTokensOptions {
  apikey: string;
  model: keyof typeof tokenLimits;
}

export type TranslationIterator = () => Promise<{
  done: boolean;
  limit: boolean;
  content: string;
}>;

function responseFormat({ to, model }: { to: string; model: string }): { type: string } | undefined {
  if (model === 'gpt-4-1106-preview' || model === 'gpt-3.5-turbo-1106') {
    if (to.toLowerCase() === 'json object') {
      return { type: 'json_object' };
    }
  }

  return undefined;
}

export async function translate({ input, from, to, apikey, model }: TranslateOptions): Promise<TranslationIterator> {
  const messages = buildMessages({ input, from, to });

  const tokens = count(messages);
  const limit = tokenLimits[model];

  if (tokens >= limit) {
    return async () => {
      return Promise.resolve({
        done: true,
        limit: false,
        content: `ERROR:\n  The input is too long to translate.\n  Please shorten your input and retry.\n\n  Used tokens: ${tokens}\n  Maximum tokens: ${limit}`,
      });
    };
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apikey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      stream: true,
      response_format: responseFormat({ to, model }),
      messages,
    }),
  });

  if (!resp.ok) {
    throw new Error('Failed to invoke OpenAI API.');
  }

  const reader = resp.body?.getReader()!;

  return async () => {
    const { done, value } = await reader.read();
    const s = new TextDecoder().decode(value);
    const values = s
      .split('\n\n')
      .filter((x) => x.startsWith('data: ') && x !== 'data: [DONE]')
      .map((x) => JSON.parse(x.slice('data: '.length)));

    const content = values
      .map((x) => x.choices[0].delta.content)
      .join('');

    const limit = values.some((x) => x.choices[0].finish_reason === 'length');

    return {
      done,
      content,
      limit,
    };
  };
}

interface HistoryObject {
  input: string;
  from: string;
  to: string;
  model: string;
  output: string[];
  timestamp: number;
}

const HISTORY_KEY = 'super-translator-history';

function loadHistory(): HistoryObject[] {
  try {
    return JSON.parse(window.localStorage?.getItem(HISTORY_KEY) ?? '[]') ?? [];
  } catch (err) {
    return [];
  }
}

function saveHistory(x: HistoryObject) {
  try {
    const hist = loadHistory();
    window.localStorage?.setItem(HISTORY_KEY, JSON.stringify([x, ...hist].slice(0, 100)));
  } catch (err) {
    // Nothing to do.
  }
}

export async function translateWithCache(req: TranslateOptions): Promise<TranslationIterator> {
  const cache = loadHistory().find((x) => (
    x.input === req.input &&
      x.from === req.from &&
      x.to === req.to &&
      x.model === req.model
  ));

  const ttl = 7 * 24 * 60 * 60 * 1000; // The cache is available up to 7 days.

  if (cache != null && cache.timestamp + ttl > new Date().getTime()) {
    let idx = 0;

    return async () => new Promise((resolve) => {
      setTimeout(() => {
        const content = cache.output[idx];
        idx++;
        resolve({
          content: content,
          done: idx >= cache.output.length,
          limit: false,
        });
      }, idx === 0 ? 0 : 5);
    });
  }

  const itr = await translate(req);
  let output: string[] = [];

  return async () => {
    const { content, done, limit } = await itr();

    output.push(content);
    if (done && !limit) {
      saveHistory({
        input: req.input,
        from: req.from,
        to: req.to,
        model: req.model,
        output,
        timestamp: new Date().getTime(),
      });
    }

    return { content, done, limit };
  };
}
