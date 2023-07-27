import { tokenLimits } from './models';
import countTokens from './tokenizer';

export interface Options {
  input: string;
  from: string;
  to: string;
  apikey: string;
  model: string;
}

export default async function translate({ input, from, to, apikey, model }: Options) {
  const messages = [
    {
      role: 'system',
      content: 'Give conversion from source to output. Use the same language as source if not specified language.',
    },
    {
      role: 'user',
      content: 'source: Casual\noutput: Formal\n\n###\n\nやあ！ 元気？',
    },
    {
      role: 'assistant',
      content: 'こんにちは。お元気ですか？',
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

  const tokens = countTokens(messages);
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
      messages,
    }),
  });

  if (!resp.ok) {
    throw new Error('Failed to invoke OpenAI API.');
  }

  const reader = resp.body.getReader();

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
