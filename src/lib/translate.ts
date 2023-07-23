export interface Options {
  input: string;
  from: string;
  to: string;
  apikey: string;
  model: string;
}

export default async function translate({ input, from, to, apikey, model }: Options) {
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
      messages: [{
        role: 'user',
        content: 'Translate following Deutsch to English.',
      }, {
        role: 'user',
        content: 'Hallo! Wie geht es dir?',
      }, {
        role: 'assistant',
        content: 'Hello! How are you doing?',
      }, {
        role: 'user',
        content: 'Translate following Casual to Formal.',
      }, {
        role: 'user',
        content: 'やあ！ 元気？',
      }, {
        role: 'assistant',
        content: 'こんにちは。お元気ですか？',
      }, {
        role: 'user',
        content: 'Translate following JavaScript to Python.',
      }, {
        role: 'user',
        content: 'function greeting() {\n  console.log("hello");\n}',
      }, {
        role: 'assistant',
        content: 'def greeting():\n    print("hello")',
      }, {
        role: 'user',
        content: `Translate following ${from.trim() === 'auto' ? 'message' : from.trim() || 'auto'} to ${to.trim()}.`,
      }, {
        role: 'user',
        content: input,
      }],
    }),
  });

  if (!resp.ok) {
    throw new Error('Failed to invoke OpenAI API.');
  }

  const reader = resp.body.getReader();

  return async () => {
    const { done, value } = await reader.read();
    const s = new TextDecoder().decode(value);
    const content = s
      .split('\n\n')
      .filter((x) => x.startsWith('data: ') && x !== 'data: [DONE]')
      .map((x) => JSON.parse(x.slice('data: '.length)).choices[0].delta.content)
      .join('');
    return {
      done,
      content,
    };
  };
}
