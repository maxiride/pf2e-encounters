<script lang="ts">
  import type { FontFamily, FontSource } from '../core/themes/themeTypes';
  import { editorState, setFontSources, transaction } from '../core/store/editorStore';
  import { applyFontSources, applyFontStacks } from '../core/fonts/fontLoader';
  import {
    buildSourceFromFontFaceText,
    buildSourceFromUrl,
    discoverFamiliesFromUrl,
    parseFontFaceText,
    type ParsedFamily,
  } from '../core/fonts/fontParse';
  import UIPillButton from './UIPillButton.svelte';
  import UISegmentedControl from './UISegmentedControl.svelte';
  import UIInfoPopover from './UIInfoPopover.svelte';

  type AddMode = 'closed' | 'name' | 'paste';
  let addMode: AddMode = $state('closed');

  // By-name (Google Fonts) — type a family name; we build the CSS2 URL.
  let nameInput = $state('');
  let nameError = $state('');
  let nameDiscovering = $state(false);
  let nameParsed: ParsedFamily[] | null = $state(null);

  // Unified paste — accepts a bare URL, `<link>` tag, `@import url(...)`,
  // or one or more `@font-face { ... }` rules. We sniff which on Detect.
  let pasteInput = $state('');
  let pasteError = $state('');
  let pasteDiscovering = $state(false);
  let urlParsed: ParsedFamily[] | null = $state(null);
  let urlPickedNames = $state(new Set<string>());
  let urlNeedsManualFamilies = $state(false);
  let urlManualFamilies = $state('');
  let fontFaceParsed: ParsedFamily[] = $state([]);

  function reset() {
    addMode = 'closed';
    nameInput = '';
    nameError = '';
    nameDiscovering = false;
    nameParsed = null;
    pasteInput = '';
    pasteError = '';
    pasteDiscovering = false;
    urlParsed = null;
    urlPickedNames = new Set();
    urlNeedsManualFamilies = false;
    urlManualFamilies = '';
    fontFaceParsed = [];
  }

  // Pull a fonts URL out of whatever the user pastes: bare URL, link tag,
  // @import url(...), or a full style-tag wrapper around an @import.
  function extractFontsUrl(raw: string): string | null {
    const text = raw.trim();
    if (!text) return null;
    const href = text.match(/href\s*=\s*["']([^"']+)["']/i);
    if (href) return href[1];
    const importUrl = text.match(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    if (importUrl) return importUrl[1];
    const importBare = text.match(/@import\s+['"]([^'"]+)['"]/i);
    if (importBare) return importBare[1];
    if (/^https?:\/\//i.test(text)) return text;
    return null;
  }

  let fontSourcesList = $derived($editorState.fonts.sources);
  let fontStacksList = $derived($editorState.fonts.stacks);

  function commitSources(next: FontSource[]) {
    setFontSources(next);
    applyFontSources(next);
    applyFontStacks(fontStacksList, next);
  }

  /** One paste field → sniff whether it's @font-face or a URL/embed and
   *  populate the matching detected-families state. */
  async function detectPaste() {
    pasteError = '';
    urlParsed = null;
    urlNeedsManualFamilies = false;
    fontFaceParsed = [];
    const text = pasteInput.trim();
    if (!text) {
      pasteError = 'Paste a URL, embed, or @font-face rule';
      return;
    }
    if (/@font-face/i.test(text)) {
      fontFaceParsed = parseFontFaceText(text);
      if (fontFaceParsed.length === 0) {
        pasteError = "Couldn't parse @font-face rules";
      }
      return;
    }
    const url = extractFontsUrl(text);
    if (!url) {
      pasteError = "Couldn't find a fonts URL or @font-face rule in that paste";
      return;
    }
    pasteDiscovering = true;
    try {
      const found = await discoverFamiliesFromUrl(url);
      if (found && found.length > 0) {
        urlParsed = found;
        urlPickedNames = new Set(found.map((f) => f.name));
      } else {
        urlNeedsManualFamilies = true;
      }
    } catch (e) {
      pasteError = 'Discovery failed';
      urlNeedsManualFamilies = true;
    }
    pasteDiscovering = false;
  }

  /** Build a Google Fonts CSS2 URL for a family name, requesting a wide
   *  weight range with italics. Works for variable fonts and most static
   *  multi-weight families. Single-weight static fonts (e.g. GFS Didot) will
   *  reject the range axis with 400 Bad Request — Chrome then CORBs the
   *  response. Such fonts must be persisted as `?family=Name&display=swap`. */
  function googleUrlForName(name: string): string {
    const family = name.trim().replace(/\s+/g, '+');
    return `https://fonts.googleapis.com/css2?family=${family}:ital,wght@0,100..900;1,100..900&display=swap`;
  }

  async function discoverByName() {
    nameError = '';
    nameParsed = null;
    if (!nameInput.trim()) {
      nameError = 'Enter a family name';
      return;
    }
    nameDiscovering = true;
    try {
      const found = await discoverFamiliesFromUrl(googleUrlForName(nameInput));
      if (found && found.length > 0) {
        nameParsed = found;
      } else {
        nameError = `Couldn't find "${nameInput.trim()}" on Google Fonts`;
      }
    } catch {
      nameError = `Couldn't reach Google Fonts for "${nameInput.trim()}"`;
    }
    nameDiscovering = false;
  }

  function addNameSource() {
    if (!nameParsed || nameParsed.length === 0) return;
    if (nameDuplicate) return;
    // $state.snapshot() unwraps the reactive proxy. Without it the FontSource
    // we hand to the store carries proxy arrays (weights, etc.) and the next
    // `mutate()` call fails with DataCloneError inside structuredClone.
    const families = $state.snapshot(nameParsed) as ParsedFamily[];
    const source = buildSourceFromUrl(googleUrlForName(nameInput), families);
    commitSources([...fontSourcesList, source]);
    reset();
  }

  /** Case-insensitive family-name match against existing sources. Used to
   *  block duplicate adds and surface a notice under the Add button. */
  function findExistingFamilyByName(name: string): string | null {
    const lower = name.trim().toLowerCase();
    if (!lower) return null;
    for (const src of fontSourcesList) {
      for (const fam of src.families) {
        if (fam.name.toLowerCase() === lower) return fam.name;
      }
    }
    return null;
  }

  let nameDuplicate = $derived.by(() => {
    if (!nameParsed || nameParsed.length === 0) return null;
    return findExistingFamilyByName(nameParsed[0].name);
  });

  function addUrlSource() {
    const url = extractFontsUrl(pasteInput);
    if (!url) {
      pasteError = "Couldn't find a fonts URL in that paste";
      return;
    }
    let families: ParsedFamily[] = [];
    if (urlParsed) {
      // Snapshot to drop the $state proxy — see comment in addNameSource.
      families = ($state.snapshot(urlParsed) as ParsedFamily[]).filter((f) => urlPickedNames.has(f.name));
    } else if (urlNeedsManualFamilies) {
      families = urlManualFamilies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name }));
    }
    if (families.length === 0) {
      pasteError = 'Pick at least one family';
      return;
    }
    const source = buildSourceFromUrl(url, families);
    commitSources([...fontSourcesList, source]);
    reset();
  }

  function addFontFaceSource() {
    if (fontFaceParsed.length === 0) return;
    const families = $state.snapshot(fontFaceParsed) as ParsedFamily[];
    const source = buildSourceFromFontFaceText(pasteInput, families);
    commitSources([...fontSourcesList, source]);
    reset();
  }

  function removeFamily(sourceId: string, familyId: string) {
    const next = fontSourcesList
      .map((s) => (s.id === sourceId ? { ...s, families: s.families.filter((f) => f.id !== familyId) } : s))
      .filter((s) => s.families.length > 0);
    const updatedStacks = fontStacksList.map((stack) => ({
      ...stack,
      slots: stack.slots.filter((slot) => !(slot.kind === 'project' && slot.familyId === familyId)),
    }));
    transaction('remove font family', (s) => {
      s.fonts.sources = next;
      s.fonts.stacks = updatedStacks;
    });
    applyFontSources(next);
    applyFontStacks(updatedStacks, next);
  }

  /** Resolve a clickable target for the row. We prefer the human-readable
   *  specimen/family page (Google Fonts, Adobe Fonts) over the raw CSS/font
   *  file — those are rarely what a user wants to look at. */
  function familyHref(source: FontSource, family: FontFamily): string | null {
    if (source.kind === 'google') {
      return `https://fonts.google.com/specimen/${family.name.trim().replace(/\s+/g, '+')}`;
    }
    if (source.kind === 'typekit') {
      const slug = family.name.trim().toLowerCase().replace(/\s+/g, '-');
      return `https://fonts.adobe.com/fonts/${slug}`;
    }
    if (source.kind === 'css-url') return source.url ?? null;
    return null; // font-face: no public page exists
  }

  function sourceKindLabel(source: FontSource): string {
    if (source.kind === 'google') return 'Google';
    if (source.kind === 'typekit') return 'Typekit';
    if (source.kind === 'font-face') return 'Local';
    return 'CSS URL';
  }
</script>

<section class="project-fonts">
  <header class="pf-header">
    <div class="pf-title-row">
      <h3 class="group-title">Project Fonts</h3>
      <UIInfoPopover title="Installing fonts" ariaLabel="How to install fonts">
        <p>Three ways to install a font, depending on where it lives:</p>
        <p>
          <strong>Google Fonts</strong> — use <em>By name</em> and type the family
          (e.g. <code>Inter</code>). We fetch the CSS2 URL for you.
        </p>
        <p>
          <strong>Hosted CDN (Adobe, Fontshare, custom)</strong> — use <em>Paste</em>
          with a fonts URL, a <code>&lt;link&gt;</code> tag, or an <code>@import url(...)</code> line.
        </p>
        <p>
          <strong>Local files</strong> — drop your <code>.woff2</code> files into
          <code>src/system/styles/fonts/&lt;Family&gt;/</code>, then paste the matching
          <code>@font-face &#123; ... &#125;</code> rules into <em>Paste</em>. The folder ships
          with the production build, so <code>src/...</code> paths resolve at runtime.
        </p>
      </UIInfoPopover>
    </div>
    <UIPillButton
      variant="primary"
      icon="fa-plus"
      onclick={() => { addMode = addMode === 'closed' ? 'name' : 'closed'; }}
    >Add Font</UIPillButton>
  </header>

  {#if fontSourcesList.length === 0}
    <p class="pf-empty">No fonts loaded yet. Use the add button below.</p>
  {/if}

  <ul class="pf-family-list">
    {#each fontSourcesList as source (source.id)}
      {#each source.families as fam (fam.id)}
        {@const href = familyHref(source, fam)}
        <li class="pf-family">
          <span class="pf-family-preview" style="font-family: {fam.cssName}, sans-serif;">Ag</span>
          <span class="pf-family-name">{fam.name}</span>
          <UIPillButton
            variant="outline"
            size="compact"
            href={href ?? undefined}
            target={href ? '_blank' : undefined}
            disabled={!href}
            title={href ? `Open ${fam.name} on ${sourceKindLabel(source)}` : 'No public page for local fonts'}
          >{sourceKindLabel(source)}</UIPillButton>
          <button
            type="button"
            class="pf-family-remove"
            onclick={() => removeFamily(source.id, fam.id)}
            aria-label={`Remove ${fam.name}`}
            title="Remove family"
          ><i class="fas fa-xmark" aria-hidden="true"></i></button>
        </li>
      {/each}
    {/each}
  </ul>

  {#if addMode !== 'closed'}
    <div class="pf-add-panel">
      <div class="pf-add-head">
        <span class="pf-add-eyebrow">Browse</span>
        <div class="pf-browse-row">
          <UIPillButton variant="outline" href="https://fonts.google.com/" target="_blank" icon="fa-arrow-up-right-from-square">
            Google Fonts
          </UIPillButton>
          <UIPillButton variant="outline" href="https://fonts.adobe.com/" target="_blank" icon="fa-arrow-up-right-from-square">
            Adobe Fonts
          </UIPillButton>
          <UIPillButton variant="outline" href="https://www.fontshare.com/" target="_blank" icon="fa-arrow-up-right-from-square">
            Fontshare
          </UIPillButton>
        </div>
        <button type="button" class="pf-add-close" onclick={reset} aria-label="Cancel">×</button>
      </div>

      <div class="pf-add-divider"><span>or add directly</span></div>

      <UISegmentedControl
        value={addMode}
        options={[
          { value: 'name', label: 'By name (Google)' },
          { value: 'paste', label: 'Paste URL or @font-face' },
        ] as const}
        ariaLabel="Add font by"
        onchange={(v) => (addMode = v)}
      />

      {#if addMode === 'name'}
        <div class="pf-row">
          <input
            type="text"
            class="ui-form-input pf-name-input"
            placeholder="e.g. Inter, Fraunces, Space Mono"
            bind:value={nameInput}
            onkeydown={(e) => { if (e.key === 'Enter' && !nameParsed) discoverByName(); }}
          />
          {#if nameParsed}
            <UIPillButton variant="primary" onclick={addNameSource} disabled={!!nameDuplicate}>Add</UIPillButton>
          {:else}
            <UIPillButton variant="secondary" onclick={discoverByName} disabled={!nameInput.trim() || nameDiscovering}>
              {nameDiscovering ? 'Checking…' : 'Find'}
            </UIPillButton>
          {/if}
        </div>
        {#if nameError}<div class="pf-error">{nameError}</div>{/if}
        {#if nameParsed}
          {#if nameDuplicate}
            <div class="pf-notice">
              <strong>{nameDuplicate}</strong> is already in your project fonts.
            </div>
          {:else}
            <div class="pf-detected">
              Found <strong>{nameParsed[0].name}</strong>
              {#if nameParsed[0].weights && nameParsed[0].weights.length > 0}
                <span class="pf-check-meta">({nameParsed[0].weights.length} weights)</span>
              {/if}
            </div>
          {/if}
        {/if}
      {:else if addMode === 'paste'}
        <textarea
          class="ui-form-input pf-textarea pf-url-input"
          placeholder={'A fonts URL, <link> tag, or @import url(...)\n\nor\n\none or more @font-face { ... } rules'}
          rows="5"
          bind:value={pasteInput}
        ></textarea>
        <div class="pf-row">
          <UIPillButton variant="secondary" onclick={detectPaste} disabled={!pasteInput.trim() || pasteDiscovering}>
            {pasteDiscovering ? 'Checking…' : 'Detect'}
          </UIPillButton>
        </div>
        {#if pasteError}<div class="pf-error">{pasteError}</div>{/if}
        {#if fontFaceParsed.length > 0}
          <div class="pf-detected">Detected @font-face: {fontFaceParsed.map((f) => f.name).join(', ')}</div>
          <UIPillButton variant="primary" onclick={addFontFaceSource}>Add</UIPillButton>
        {:else if urlParsed}
          <div class="pf-detected">Detected families — pick which to add:</div>
          <ul class="pf-checklist">
            {#each urlParsed as f (f.name)}
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={urlPickedNames.has(f.name)}
                    onchange={(e) => {
                      const target = e.currentTarget;
                      const s = new Set(urlPickedNames);
                      if (target.checked) s.add(f.name); else s.delete(f.name);
                      urlPickedNames = s;
                    }}
                  />
                  <span class="pf-check-name">{f.name}</span>
                  {#if f.weights && f.weights.length > 0}
                    <span class="pf-check-meta">{f.weights.length}w</span>
                  {/if}
                </label>
              </li>
            {/each}
          </ul>
          <UIPillButton variant="primary" onclick={addUrlSource}>Add {urlPickedNames.size} selected</UIPillButton>
        {:else if urlNeedsManualFamilies}
          <div class="pf-detected">Couldn't auto-detect families (CORS or no metadata). Name them:</div>
          <input
            type="text"
            class="ui-form-input"
            placeholder="Comma-separated family names"
            bind:value={urlManualFamilies}
          />
          <UIPillButton variant="primary" onclick={addUrlSource} disabled={!urlManualFamilies.trim()}>Add</UIPillButton>
        {/if}
      {/if}
    </div>
  {/if}
</section>

<style>
  .project-fonts {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
  }

  .pf-header {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
    justify-content: space-between;
  }

  .pf-title-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-4);
  }

  .group-title {
    margin: 0;
    font-size: var(--ui-font-size-xl);
    font-weight: var(--ui-font-weight-bold);
    color: var(--ui-text-primary);
  }

  .pf-empty {
    margin: 0;
    padding: var(--ui-space-8) 0;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-sm);
  }

  .pf-family-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(22rem, 100%), 1fr));
    gap: var(--ui-space-6);
    align-items: start;
  }

  .pf-family {
    display: grid;
    grid-template-columns: 1.75rem 1fr auto 24px;
    align-items: center;
    gap: var(--ui-space-8);
    min-width: 0;
    padding: var(--ui-space-4) var(--ui-space-8);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface-subtle, rgba(255,255,255,0.02));
    min-height: 36px;
  }
  .pf-family:hover {
    background: var(--ui-surface-hover, rgba(255,255,255,0.04));
  }

  .pf-family-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-muted);
    cursor: pointer;
    font-size: var(--ui-font-size-sm);
    line-height: 1;
  }
  .pf-family-remove:hover {
    color: var(--ui-text-primary);
    background: var(--ui-surface-hover, rgba(255,255,255,0.06));
  }

  .pf-family-preview {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
    min-width: 1.75rem;
    text-align: center;
    line-height: 1.2;
  }

  .pf-family-name {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pf-add-panel {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-10);
    padding: var(--ui-space-12);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: var(--ui-radius-md);
    background: rgba(255, 255, 255, 0.15);
  }

  .pf-add-head {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--ui-space-12);
  }
  .pf-add-eyebrow {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .pf-browse-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-8);
  }
  .pf-add-close {
    background: none;
    border: none;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-lg);
    line-height: 1;
    padding: var(--ui-space-2) var(--ui-space-6);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    justify-self: end;
  }
  .pf-add-close:hover {
    color: var(--ui-text-primary);
    background: var(--ui-surface-hover, rgba(255,255,255,0.06));
  }

  .pf-add-divider {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .pf-add-divider::before,
  .pf-add-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--ui-border-low);
  }

  .pf-name-input {
    flex: 1;
    min-width: 0;
  }

  .pf-row {
    display: flex;
    gap: var(--ui-space-8);
    align-items: center;
  }

  .pf-error { color: var(--ui-text-danger, #ff6b6b); font-size: var(--ui-font-size-sm); }

  .pf-detected { color: var(--ui-text-secondary); font-size: var(--ui-font-size-sm); }

  .pf-notice {
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
  }
  .pf-notice strong { color: var(--ui-text-primary); }

  .pf-checklist {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }
  .pf-checklist label {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
  }
  .pf-check-name { color: var(--ui-text-primary); }
  .pf-check-meta { color: var(--ui-text-tertiary); font-family: var(--ui-font-mono); font-size: var(--ui-font-size-xs); }

  .pf-textarea {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    resize: vertical;
    color: var(--ui-text-primary);
  }
  .pf-textarea::placeholder { color: var(--ui-text-muted); opacity: 1; }

  .pf-url-input {
    white-space: pre;
    overflow-x: auto;
  }

</style>
