<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  buildFullDocument,
  renderAppMarkup,
  type RenderContext,
} from "./ssr/buildDocument";

const context = ref<RenderContext>("preview");
const innerMarkup = ref("");
const fullDocument = ref("");
const loading = ref(true);
const error = ref("");

async function regenerate() {
  loading.value = true;
  error.value = "";
  try {
    innerMarkup.value = await renderAppMarkup(
      (await import("./example/cmsData")).exampleMenuCms,
    );
    fullDocument.value = await buildFullDocument(context.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(regenerate);
</script>

<template>
  <main class="shell">
    <header>
      <h1>PCMS SSR demo</h1>
      <p class="lede">
        <code>renderToString</code> returns <strong>inner HTML only</strong>.
        Export wraps it in a document shell (URLs, CMS JSON, optional client ESM).
      </p>
      <div class="controls">
        <label>
          Context
          <select v-model="context" @change="regenerate">
            <option value="preview">preview (Local CDN)</option>
            <option value="publish">publish (reversed CDN)</option>
          </select>
        </label>
        <button type="button" @click="regenerate">Regenerate</button>
      </div>
    </header>

    <p v-if="loading">Rendering…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <section v-if="!loading && !error">
      <h2>1. Raw <code>renderToString</code> output</h2>
      <p class="hint">
        No <code>&lt;html&gt;</code>, no CSS, no scripts. Real tags for content
        (works if you save only this inside an existing page).
      </p>
      <pre class="code">{{ innerMarkup }}</pre>

      <h2>2. Full export document</h2>
      <p class="hint">
        What LCDN / reversed CDN stores: shell + inlined CMS + import map +
        client entry (preview vs publish URLs differ).
      </p>
      <pre class="code">{{ fullDocument }}</pre>

      <h2>3. Preview (iframe, JS disabled)</h2>
      <p class="hint">
        Content visible without scripts — snapshot HTML carries the markup.
      </p>
      <iframe
        class="preview"
        sandbox="allow-same-origin"
        :srcdoc="fullDocument"
      />
    </section>
  </main>
</template>

<style>
:root {
  font-family: system-ui, sans-serif;
  line-height: 1.5;
  color: #1a1a1a;
  background: #f4f4f5;
}

.shell {
  max-width: 52rem;
  margin: 0 auto;
  padding: 1.5rem;
}

.lede {
  color: #444;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: end;
  margin-top: 1rem;
}

.controls label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
}

select,
button {
  font: inherit;
  padding: 0.4rem 0.6rem;
}

h2 {
  margin-top: 2rem;
  font-size: 1.1rem;
}

.hint {
  font-size: 0.875rem;
  color: #555;
}

.code {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  overflow: auto;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview {
  width: 100%;
  height: 280px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
}

.error {
  color: #b00020;
}
</style>
