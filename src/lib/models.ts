import { readable } from 'svelte/store';

export const tokenLimits = {
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-16k': 16385,
  'gpt-3.5-turbo-1106': 16385,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-1106-preview': 128000,
};

const allModelNames = Object.keys(tokenLimits);

let setModels = (_: string[]) => {};

export const models = readable(allModelNames, (set) => {
  setModels = set;
});

export async function refreshModels(apikey: string) {
  if (!apikey.match(/sk-[a-zA-Z0-9]+/)) {
    setModels(allModelNames);
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
    const models = all.filter((id: string) => allModelNames.includes(id));
    models.sort();

    if (models.length > 0) {
      setModels(models);
    } else {
      setModels(allModelNames);
    }
  } catch (err) {
    setModels(allModelNames);
    throw err;
  }
}
