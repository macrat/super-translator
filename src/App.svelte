<script lang="ts">
  import { onMount } from 'svelte';
  import { translateWithCache, countTokens } from './lib/translate';
  import { models, refreshModels, tokenLimits } from './lib/models';
  import { loaded as tokenizerLoaded } from './lib/tokenizer';
  import languages from './languages.json';
  import termsOfUse from './terms-of-use.txt?raw';

  const preferLanguage = navigator.language.split('-')[0].toLowerCase()
  const languageSet = languages[preferLanguage] ?? languages.en;
  const defaultLanguage = new Intl.DisplayNames([preferLanguage], { type: 'language' }).of(preferLanguage);

  let input = '';
  let output = '';
  let from = 'auto';
  let to = defaultLanguage;
  let apikey = '';
  let model = 'gpt-3.5-turbo'
  let loading = false;

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
    const newpath = '?' + query.toString();
    if (newpath !== location.search) {
      history.pushState(null, null, newpath);
    }
  }

  function loadQuery() {
    const query = new URLSearchParams(location.search);
    input = query.get('text') || '';
    from = query.get('sl') || from || 'auto';
    to = query.get('tl') || to || defaultLanguage;
    if (to === 'auto') {
      to = defaultLanguage;
    }

    if (input.trim() && apikey.trim() && query.get('run') !== 'false') {
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

    loading = true;

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
      const read = await translateWithCache({ input, from, to, apikey, model });
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

    loading = false;
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
  <div>
    <!-- svelte-ignore a11y-autofocus -->
    <textarea bind:value={input} autofocus bind:this={fromElm} on:scroll={syncScroll(fromElm, toElm)} placeholder="Input text here" />
    {#if $tokenizerLoaded}
      <span id="token-count">{countTokens({ input, from, to })} / {tokenLimits[model]} tokens</span>
    {/if}
  </div>
  <form on:submit|preventDefault={() => run(true)}>
    <label>From<input bind:value={from} autocomplete="on" list="languages-from" on:change={saveSettings} /></label>
    <label>To<input bind:value={to} autocomplete="on" list="languages-to" on:change={saveSettings} /></label>
    <button>
      Translate
      {#if loading }
        <span id="loading" />
      {/if}
    </button>
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

    <a href={`/?sl=English&tl=auto&text=${encodeURIComponent(termsOfUse)}&run=false`} target="_blank" rel="noopener">Terms and Policies</a>
  </form>
  <div>
    <textarea bind:this={toElm} on:scroll={syncScroll(toElm, fromElm)} value={output} readonly placeholder="Translated version here" />
  </div>
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

  div {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    margin: 12px;
  }
  textarea {
    height: 100%;
    overflow: auto;
    font-family: inherit;
    font-size: inherit;
    padding: 12px 16px 16px;
    box-sizing: border-box;
    border: none;
    resize: none;
    color: #333;
    background-color: #eee;
  }
  #token-count {
    position: absolute;
    right: 12px;
    bottom: 0;
    color: #4f4f4f;
    background-color: rgba(238, 238, 238, 0.7);
    padding: 2px 4px 4px;
    font-size: 90%;
  }

  form {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4px 0;
    width: 9rem;
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
  label:first-child {
    margin-top: auto;
  }
  input, select {
    font-size: 120%;
    border: none;
    border-bottom: 2px solid #aaa;
    padding: 8px 4px;
    background-color: #f3f3f3;
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
    position: relative;
    color: #fff;
    background-color: #766;
    padding: 8px 4px;
    border: none;
    cursor: pointer;
  }
  button:focus {
    outline: 2px solid #000;
  }
  button:active {
    background-color: #988;
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

  a {
    font-size: 80%;
    color: #666;
    margin: auto 0 4px;
    text-align: center;
  }

  #loading {
    position: absolute;
    bottom: 0;
    height: 2px;
    background-color: #baa;
    animation: loading 1.5s linear infinite;
  }
  @keyframes loading {
    0% {
      width: 0;
      left: 0;
    }
    50% {
      width: 100%;
      left: 0;
    }
    100% {
      width: 0;
      left: 100%;
    }
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
      width: auto;
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
    a {
      margin: 0 16px;
    }
  }

  @media (prefers-color-scheme: dark) {
    main {
      background-color: #111;
    }
    label, a {
      color: #aaa;
    }
    input, select, textarea {
      color: #eee;
      background-color: #333;
    }
    input, select {
      border-bottom-color: #999;
    }
    #token-count {
      color: #c2c2c2;
      background-color: rgba(51, 51, 51, 0.7);
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
