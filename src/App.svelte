<script lang="ts">
  import { onMount } from 'svelte';
  import translate from './lib/translate';
  import { models, refreshModels } from './lib/models';
  import languages from './languages.json';

  const preferLanguage = navigator.language.split('-')[0].toLowerCase()
  const languageSet = languages[preferLanguage] ?? languages.en;
  const defaultLanguage = new Intl.DisplayNames([preferLanguage], { type: 'language' }).of(preferLanguage);

  let input = '';
  let output = '';
  let from = 'auto';
  let to = defaultLanguage;
  let apikey = '';
  let model = 'gpt-3.5-turbo'

  let fromElm: HTMLTextAreaElement;
  let toElm: HTMLTextAreaElement;
  let keyElm: HTMLInputElement;

  const syncScroll = (source: HTMLElement, target: HTMLElement) => () => {
    const pos = source.scrollTop / (source.scrollHeight - source.clientHeight);
    target.scrollTop = Math.round(pos * (target.scrollHeight - target.clientHeight));
  };

  function pushHistory() {
    const query = new URLSearchParams();
    query.append('sl', from);
    query.append('tl', to);
    query.append('text', input);
    history.pushState(null, null, '?' + query.toString());
  }

  function loadQuery() {
    const query = new URLSearchParams(location.search);
    input = query.get('text') || '';
    from = query.get('sl') || from || 'auto';
    to = query.get('tl') || to || defaultLanguage;
    if (to === 'auto') {
      to = defaultLanguage;
    }

    if (input.trim() && apikey.trim()) {
      run();
    }
  }

  let translateID = 0;
  async function run(setHistory = false) {
    if (!apikey.trim()) {
      alert('Please set API Key before translate');
      return;
    }

    output = '';

    if (!input.trim()) {
      return;
    }

    if (!from.trim()) {
      from = 'auto';
    }
    if (!to.trim() || to.trim() === 'auto') {
      to = defaultLanguage;
    }

    if (setHistory) {
      pushHistory();
    }

    translateID += 1;
    const id = translateID;

    try {
      const read = await translate({ input, from, to, apikey, model });
      output = '';
      while (translateID === id) {
        const { done, content, limit } = await read();

        output += content;

        if (limit) {
          output += '\n\n---\n\nERROR:\n  The input is too long to translate all.\n  Please shorten your input and retry.';
        }

        if (done) {
          break;
        }
      }
    } catch(err) {
      console.error(err);
      if (output !== '') {
        output += '\n\n---\n\n';
      }
      output += 'ERROR:\n  Failed to translate.\n  Please retry later.';
    }
  }

  onMount(() => {
    const raw = localStorage.getItem('super-translator-settings');

    if (raw) {
      const settings = JSON.parse(raw);
      model = settings.model;
      apikey = settings.apikey;
      from = settings.from;
      to = settings.to;

      refreshModels(apikey).catch((err) => {
        if (err.message === 'invalid key') {
          apikey = '';
        }
      });
    }

    loadQuery();
  });

  function saveSettings() {
    localStorage.setItem('super-translator-settings', JSON.stringify({
      model,
      apikey,
      from,
      to,
    }));
  }

  function onChangeAPIKey() {
    saveSettings();

    keyElm.setCustomValidity('');
    refreshModels(apikey).catch((err) => {
      if (err.message === 'invalid key') {
        keyElm.setCustomValidity('API Key is not valid.');
      }
    });
  }
</script>

<main>
  <textarea bind:value={input} autofocus bind:this={fromElm} on:scroll={syncScroll(fromElm, toElm)} placeholder="Input text here" />
  <form on:submit|preventDefault={() => run(true)}>
    <label>From<input bind:value={from} autocomplete="on" list="languages-from" on:change={saveSettings} /></label>
    <label>To<input bind:value={to} autocomplete="on" list="languages-to" on:change={saveSettings} /></label>
    <button>Translate</button>
    <label>OpenAI API Key<input bind:this={keyElm} bind:value={apikey} type="password" required pattern="sk-[a-zA-Z0-9]+" autocomplete="off" on:change={onChangeAPIKey} /></label>
    <label>Model<select bind:value={model} on:change={saveSettings}>
      {#each $models as model}
        <option value={model}>{model}</option>
      {/each}
    </select></label>

    <datalist id="languages-from">
      <option value="auto" />
      {#each languageSet as value}
        <option {value} />
      {/each}
    </datalist>

    <datalist id="languages-to">
      {#each languageSet as value}
        <option {value} />
      {/each}
    </datalist>
  </form>
  <textarea bind:this={toElm} on:scroll={syncScroll(toElm, fromElm)} value={output} readonly placeholder="Translated version here" />
</main>

<style>
  :global(body) {
    margin: 0;
  }
  main {
    display: flex;
    height: 100vh;
    height: 100dvh;
  }

  textarea {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    overflow: auto;
    font-family: inherit;
    font-size: inherit;
    margin: 12px;
    padding: 12px 16px;
    box-sizing: border-box;
    border: 1px solid #000;
  }

  form {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4px 0;
  }
  label, button {
    margin: 8px 0;
  }
  input, select, button {
    display: block;
    width: 9rem;
    box-sizing: border-box;
  }
  label {
    font-size: 80%;
    color: #666;
  }
  input, select {
    font-size: 120%;
    border: none;
    border-bottom: 2px solid #aaa;
    padding: 8px 4px;
    background-color: #f3f3f3;
    transition: .2s border-color;
  }
  input:focus, select:focus {
    border-bottom: 2px solid #000;
    outline: none;
  }
  input:invalid {
    border-bottom-color: #f99;
  }
  input:focus:invalid {
    border-bottom-color: #f00;
  }
  button {
    color: #fff;
    background-color: #766;
    padding: 8px 4px;
    border: none;
    transition: .1s background-color;
    cursor: pointer;
  }
  button:focus {
    outline: 2px solid #000;
  }
  button:active {
    background-color: #988;
  }
  textarea {
    border: none;
    resize: none;
    color: #333;
    background-color: #eee;
  }
  textarea:focus {
    outline: 2px solid #000;
  }
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background-color: #ddd;
  }
  ::-webkit-scrollbar-thumb {
    background-color: #999;
  }

  @media (max-width: 720px) {
    main {
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
    }
    form {
      flex-direction: row;
      flex-wrap: wrap;
    }
    label {
      flex: 1 0 40%;
      min-width: 100px;
      margin: 8px;
    }
    button {
      flex: 1 1 100%;
      margin: 8px;
    }
    input, select {
      width: 100%;
    }
  }

  @media (prefers-color-scheme: dark) {
    main {
      background-color: #111;
    }
    label {
      color: #aaa;
    }
    input, select, textarea {
      color: #eee;
      background-color: #333;
    }
    input, select {
      border-bottom-color: #999;
    }
    input:focus, select:focus {
      border-bottom-color: #f0f0f0;
    }
    button:focus {
      outline-color: #eee;
    }
    button:active {
      background-color: #877;
    }
    textarea:focus {
      outline: 1px solid #aaa;
    }
    ::-webkit-scrollbar-track {
      background-color: #444;
    }
    ::-webkit-scrollbar-thumb {
      background-color: #888;
    }
  }
</style>

<svelte:window on:popstate={loadQuery} />
