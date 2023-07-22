<script lang="ts">
  import { onMount } from 'svelte';
  import translate from './lib/translate';

  let input = '';
  let output = '';
  let from = 'auto';
  let to = 'English';
  let apikey = '';
  let model = 'gpt-3.5-turbo'

  let fromElm: HTMLTextAreaElement;
  let toElm: HTMLPreElement;

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
    input = query.get('text') ?? '';
    from = query.get('sl') ?? 'auto';
    to = query.get('tl') ?? 'English';

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
    if (!to.trim()) {
      to = 'English';
    }

    if (setHistory) {
      pushHistory();
    }

    translateID += 1;
    const id = translateID;

    try {
      const read = await translate({ input, from, to, apikey, model });
      while (translateID === id) {
        const { done, content } = await read();
        if (done) {
          break;
        }

        output += content;
      }
    } catch(err) {
      alert('Failed to translate.');
      if (output !== '') {
        output += '\n\n---\n\n';
      }
      output += 'ERROR:\n' + JSON.stringify(err, '', '  ');
    }
  }

  onMount(() => {
    const raw = localStorage.getItem('super-translator-settings');
    if (!raw) {
      return;
    }

    const settings = JSON.parse(raw);
    model = settings.model;
    apikey = settings.apikey;
    from = settings.from;
    to = settings.to;

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
</script>

<main>
  <textarea bind:value={input} autofocus bind:this={fromElm} on:scroll={syncScroll(fromElm, toElm)} placeholder="Input text here" />
  <form on:submit|preventDefault={() => run(true)}>
    <label>From<input bind:value={from} autocomplete="on" list="languages" on:change={saveSettings} /></label>
    <label>To<input bind:value={to} autocomplete="on" list="languages" on:change={saveSettings} /></label>
    <button>Translate!</button>
    <label>OpenAI API Key<input bind:value={apikey} type="password" required on:change={saveSettings} /></label>
    <label>Model<select bind:value={model} on:change={saveSettings}>
      <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
      <option value="gpt-3.5-turbo-16k">gpt-3.5-turbo-16k</option>
      <option value="gpt-4">gpt-4</option>
      <option value="gpt-4-32k">gpt-4-32k</option>
    </select></label>

    <datalist id="languages">
      <option value="auto" />
      <option value="Professional" />
      <option value="Friendly" />
      <option value="Explanation" />
      <option value="Summary" />
      <option value="Bullet points" />
      <option value="English" />
      <option value="中文" />
      <option value="हिंदी" />
      <option value="español" />
      <option value="اللغة العربية" />
      <option value="বাংলা" />
      <option value="Português" />
      <option value="русский язык" />
      <option value="日本語" />
      <option value="Deutsch" />
      <option value="JavaScript" />
      <option value="Python" />
      <option value="Java" />
      <option value="Typescript" />
      <option value="C#" />
      <option value="C++" />
      <option value="PHP" />
      <option value="Shell" />
      <option value="C" />
      <option value="Ruby" />
    </datalist>
  </form>
  <pre class="output" bind:this={toElm} on:scroll={syncScroll(toElm, fromElm)}>{output}</pre>
</main>

<style>
  :global(body) {
    margin: 0;
    height: 100vh;
    height: 100dvh;
  }
  main {
    display: flex;
  }

  textarea, pre {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    height: 100vh;
    height: 100dvh;
    overflow: auto;
    font-family: inherit;
    font-size: inherit;
    white-space: pre-wrap;
    margin: 0;
    padding: 12px 16px;
    box-sizing: border-box;
    border: 1px solid black;
  }

  form {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4px 12px;
  }
  label, button {
    margin: 8px 0;
  }
  input, select {
    display: block;
    width: 9em;
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
</style>

<svelte:window on:popstate={loadQuery} />
