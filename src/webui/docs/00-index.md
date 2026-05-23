# Live Tokens — Architecture & Developer Guide

Live Tokens is a design-token system with an in-browser editor that drives CSS
custom properties at runtime. This guide covers the architecture and the
workflows for extending it.

The package ships two ways:

- **Starter.** Clone the repo, replace `Home.svelte`, edit tokens live.
- **Library.** `npm install @motion-proto/live-tokens` and mount the overlay
  plus the editor route inside an existing Svelte 5 + Vite app.

Both modes share one source tree. Chapters call out the difference where it
matters.

## Reading order

| File | Audience | Topic |
|------|----------|-------|
| [01-overview.md](01-overview.md) | All | Purpose, shipping modes, the headline picture |
| [02-architecture.md](02-architecture.md) | All | System layers, data flow, boot |
| [03-state-and-history.md](03-state-and-history.md) | Core devs | Editor store, scopes, undo/redo, persistence |
| [04-tokens-and-themes.md](04-tokens-and-themes.md) | All | `tokens.css`, palette derivation, theme files, migrations |
| [05-component-system.md](05-component-system.md) | Component authors | Registry, alias vs config, scaffolding, sibling linking |
| [06-dev-server-plugin.md](06-dev-server-plugin.md) | Plugin devs | `themeFileApi`, route table, versioned file resources |
| [07-overlay-and-routing.md](07-overlay-and-routing.md) | UI devs | LiveEditorOverlay, columns overlay, router, iframe fan-out |
| [08-add-new-component.md](08-add-new-component.md) | Component authors | Step-by-step: runtime + editor + registry |
| [09-developer-recipes.md](09-developer-recipes.md) | All | Add tokens, add migrations, run tests, publish |
| [10-conventions-and-invariants.md](10-conventions-and-invariants.md) | All | State model, parts vs states, linking, fan-out |

If you are new, read 01 and 02, then jump to the chapter that matches your
task.

## Companion documents

- `README.md`. Install and quick-start. Read this first; the chapters here
  pick up where it leaves off.
- `src/system/styles/CONVENTIONS.md`. Token naming rules. Chapter 04
  references it rather than duplicating it.
- `c2audit/c2audit_01.md`. Pre-architecture-lock C2 review. Useful as
  historical context for why the code looks the way it does.
