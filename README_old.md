# PF2e Encounter builder (pf2e-encounter-builder)

A PF2 tool to balance encounters

## Install the dependencies
```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
quasar dev
```


### Lint the files
```bash
yarn lint
# or
npm run lint
```


### Format the files
```bash
yarn format
# or
npm run format
```


### Build the app for production
```bash
quasar build
```

### Customize the configuration
See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).


### Setting public path
See `publicPath` configuration in `quasar.config.js` [Setting public path](https://quasar.dev/quasar-cli-vite/quasar-config-file#build).

For development and deployment, the public path is set to `/`. To develop and deploy to a subfolder, set the `publicPath` to the subfolder. To develop and serve the v2 version of the app, set the `publicPath` to `/v2`.

## Fetch Pathfinder 2e creatures (automation script)

This project includes a Node.js script that politely captures and downloads all creature JSON chunks from Archives of Nethys (AoN) and merges them into a single file.

Prerequisites
- Node.js LTS and Yarn installed
- From the src\webui directory:
  - Install dependencies: `yarn`
  - If not already present, add: `yarn add axios` and `yarn add -D playwright`
  - Install a Playwright browser: `npx playwright install chromium`

Usage (run from src\webui)
- Default (all creatures):
  ```bash
  # either (simplest, from src\webui)
  yarn node fetch-creatures-playwright.js --out creatures_all.json
  # or (explicit path)
  yarn node src\scripts\fetch-creatures-playwright.js --out creatures_all.json
  ```
- With filters (use any Creatures.aspx URL with query params):
  ```bash
  yarn node src\scripts\fetch-creatures-playwright.js --pageUrl "https://2e.aonprd.com/Creatures.aspx?Level=3" --out creatures_level3.json
  ```
- Direct-download from a captured list of chunk URLs (one per line or a JSON array):
  ```bash
  yarn node src\scripts\fetch-creatures-playwright.js --urlsFile urls.txt --out creatures_all.json
  ```

Options
- `--pageUrl <url>`     Page to capture chunk URLs from (default: https://2e.aonprd.com/Creatures.aspx)
- `--out <path>`        Output JSON file path (default: creatures_all.json)
- `--concurrency <n>`   1–4 workers for downloads (default: 3)
- `--delayMin <ms>`     Min delay between requests (default: 500)
- `--delayMax <ms>`     Max delay between requests (default: 1500)
- `--headless <bool>`   true|false to run browser headless (default: true)
- `--urlsFile <path>`   Skip capture and download from a list of URLs

Notes
- Replace the placeholder contact in the script’s User-Agent with your real contact information.
- The script adds polite throttling and retries; keep concurrency low to avoid 429/403 responses.
- Output files are written relative to your current working directory.

# Style and guidelines

Where possibile always reference the rulebook chapter or AON link with the following format:
```
ref. https://2e.aonprd.com/Rules.aspx?ID=2718
```


### Setting public path
See `publicPath` configuration in `quasar.config.js` [Setting public path](https://quasar.dev/quasar-cli-vite/quasar-config-file#build).

For development and deployment, the public path is set to `/`. To develop and deploy to a subfolder, set the `publicPath` to the subfolder. To develop and serve the v2 version of the app, set the `publicPath` to `/v2`.

## Fetch Pathfinder 2e creatures (automation script)

This project includes a Node.js script that politely captures and downloads all creature JSON chunks from Archives of Nethys (AoN) and merges them into a single file.

Prerequisites
- Node.js LTS and Yarn installed
- From the src\webui directory:
  - Install dependencies: `yarn`
  - If not already present, add: `yarn add axios` and `yarn add -D playwright`
  - Install a Playwright browser: `npx playwright install chromium`

Usage (run from src\webui)
- Default (all creatures):
  ```bash
  # either (simplest, from src\webui)
  yarn node fetch-creatures-playwright.js --out creatures_all.json
  # or (explicit path)
  yarn node src\scripts\fetch-creatures-playwright.js --out creatures_all.json
  ```
- With filters (use any Creatures.aspx URL with query params):
  ```bash
  yarn node src\scripts\fetch-creatures-playwright.js --pageUrl "https://2e.aonprd.com/Creatures.aspx?Level=3" --out creatures_level3.json
  ```
- Direct-download from a captured list of chunk URLs (one per line or a JSON array):
  ```bash
  yarn node src\scripts\fetch-creatures-playwright.js --urlsFile urls.txt --out creatures_all.json
  ```

Options
- `--pageUrl <url>`     Page to capture chunk URLs from (default: https://2e.aonprd.com/Creatures.aspx)
- `--out <path>`        Output JSON file path (default: creatures_all.json)
- `--concurrency <n>`   1–4 workers for downloads (default: 3)
- `--delayMin <ms>`     Min delay between requests (default: 500)
- `--delayMax <ms>`     Max delay between requests (default: 1500)
- `--headless <bool>`   true|false to run browser headless (default: true)
- `--urlsFile <path>`   Skip capture and download from a list of URLs

Notes
- Replace the placeholder contact in the script’s User-Agent with your real contact information.
- The script adds polite throttling and retries; keep concurrency low to avoid 429/403 responses.
- Output files are written relative to your current working directory.

# Style and guidelines

Where possibile always reference the rulebook chapter or AON link with the following format:
```
ref. https://2e.aonprd.com/Rules.aspx?ID=2718
```
