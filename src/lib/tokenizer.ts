let count = (_: string) => 0;

Promise.all([
  import('@dqbd/tiktoken/lite'),
  import('@dqbd/tiktoken/encoders/cl100k_base.json'),
]).then(([tiktoken, model]) => {
  const enc = new tiktoken.Tiktoken(
    model.bpe_ranks,
    model.special_tokens,
    model.pat_str,
  );
  count = (s: string) => s ? enc.encode(s).length : 0;
});

export default function countTokens(s: string) {
  return count(s);
}
