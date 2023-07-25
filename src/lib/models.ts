import { readable } from 'svelte/store';

const ALL_MODELS = [
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
  'gpt-4',
  'gpt-4-32k',
];

let setModels = (_: string[]) => {};

export const models = readable(ALL_MODELS, (set) => {
  setModels = set;
});

export async function refreshModels(apikey: string) {
  if (!apikey.match(/sk-[a-zA-Z0-9]+/)) {
    setModels(ALL_MODELS);
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apikey}`,
      },
    });

    if (!resp.ok) {
      if (resp.status === 401) {
        throw new Error('invalid key');
      } else {
        throw new Error('failed to fetch models');
      }
    }

    const all = (await resp.json()).data.map(({ id }: { id: string }) => id);
    const models = all.filter((id: string) => ALL_MODELS.includes(id));
    models.sort();

    if (models.length > 0) {
      setModels(models);
    } else {
      setModels(ALL_MODELS);
    }
  } catch (err) {
    setModels(ALL_MODELS);
    throw err;
  }
}
