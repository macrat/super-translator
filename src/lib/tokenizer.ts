import { readable } from 'svelte/store';

// Chat tokens can count as:
// BASE_TOKENS + {total number of tokens in content} + {number of messages} * TOKENS_PER_MESSAGE
const BASE_TOKENS = 3;
const TOKENS_PER_MESSAGE = 4;

export interface Message {
  content: string;
}

let count = (_: Message[]) => 0;

export const loaded = readable(false, (setLoaded) => {
  Promise.all([
    import('@dqbd/tiktoken/lite'),
    import('@dqbd/tiktoken/encoders/cl100k_base.json'),
  ]).then(([tiktoken, model]) => {
    const enc = new tiktoken.Tiktoken(
      model.bpe_ranks,
      model.special_tokens,
      model.pat_str,
    );
    count = (ms: Message[]) => {
      if (ms.length === 0) {
        return 0;
      }
      const contentTokens = ms.reduce((acc, { content }) => (
        acc + enc.encode(content).length + TOKENS_PER_MESSAGE
      ), 0);
      console.log(ms, contentTokens + BASE_TOKENS);
      return contentTokens + BASE_TOKENS;
    };
    setLoaded(true);
  });
});

export default function countTokens(ms: Message[]): number {
  return count(ms);
}
