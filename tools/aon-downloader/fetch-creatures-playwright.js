#!/usr/bin/env node
/*
  AoN Creatures Downloader (Playwright)
  - Opens https://2e.aonprd.com/Creatures.aspx
  - Clicks "Load remaining <number>" if present
  - Captures all XHR JSON chunk URLs from elasticsearch.aonprd.com/json-data/*.json
  - Politely downloads each chunk (or uses captured bodies when available)
  - Merges and deduplicates results into a single JSON array

  Configuration:
    This script now reads its configuration from a .env file located next to this script.
    Supported variables (with defaults):
      PAGE_URL  = https://2e.aonprd.com/Creatures.aspx?sort=name-asc&display=table&columns=creature_family+rarity+size+trait+level+hp+ac+source+url+alignment
      OUT       = creatures.json
      HEADLESS  = false
      KEEP_OPEN = false
      SLOW_MO   = 500
      USER_AGENT= (empty uses browser default)
      VERBOSE   = false

  Usage:
    npm start
    # then edit .env to change behavior
*/

import {chromium} from 'playwright';
import fs from 'fs';
import path from 'path';
import readline from 'node:readline';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { buildReport } from './build-report.js';

const log = pino({
    transport: {
        target: 'pino-pretty'
    },
})

// -------- Config (.env) --------
function readDotEnv(filePath) {
    const result = {};
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const rawLine of content.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) continue;
            const eq = line.indexOf('=');
            if (eq === -1) continue;
            const key = line.slice(0, eq).trim();
            let value = line.slice(eq + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            result[key] = value;
        }
    } catch {
        // .env missing is ok; we'll rely on defaults
    }
    return result;
}

function parseBool(v, def = false) {
    if (v === undefined || v === null || v === '') return def;
    const s = String(v).trim().toLowerCase();
    if (['1','true','yes','y','on'].includes(s)) return true;
    if (['0','false','no','n','off'].includes(s)) return false;
    return def;
}

function parseIntClamp(v, def, min, max) {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return def;
    return Math.max(min, Math.min(max, n));
}

function loadConfig() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const envPath = path.join(__dirname, '.env');
    const env = readDotEnv(envPath);

    const defaults = {
        pageUrl: 'https://2e.aonprd.com/Creatures.aspx?sort=name-asc&display=table&columns=creature_family+rarity+size+trait+level+hp+ac+source+url+alignment',
        out: path.join('output', 'creatures.json'),
        headless: false,
        keepOpen: false,
        keepOpenOnError: true,
        slowMo: 500,
        userAgent: null,
        verbose: false,
    };

    return {
        pageUrl: env.PAGE_URL || defaults.pageUrl,
        out: env.OUT || defaults.out,
        headless: parseBool(env.HEADLESS, defaults.headless),
        keepOpen: parseBool(env.KEEP_OPEN, defaults.keepOpen),
        keepOpenOnError: parseBool(env.KEEP_OPEN_ON_ERROR, defaults.keepOpenOnError),
        slowMo: parseIntClamp(env.SLOW_MO, defaults.slowMo, 0, 5000),
        userAgent: env.USER_AGENT && env.USER_AGENT.trim() !== '' ? env.USER_AGENT : defaults.userAgent,
        verbose: parseBool(env.VERBOSE, defaults.verbose),
    };
}

// -------- Utilities --------

function ensureDirFor(filePath) {
    const dir = path.dirname(path.resolve(filePath));
    fs.mkdirSync(dir, {recursive: true});
}

async function waitForEnter(message = 'Press Enter to continue...') {
    return new Promise((resolve) => {
        const rl = readline.createInterface({input: process.stdin, output: process.stdout});
        rl.question(`${message}\n`, () => {
            rl.close();
            resolve();
        });
    });
}

/**
 * Clicks the exact "Load remaining <number>" button if present and actionable.
 * It will click up to a few times until the button disappears or becomes disabled.
 *
 * @param {object} page The page object to search within.
 * @return {Promise<boolean>} A promise that resolves to `true` if the button was found and clicked at least once; otherwise, `false`.
 */
async function tryLoadAll(page) {
    log.info('Searching for "Load remaining" button');
    try {
        let clickedAny = false;
        for (let i = 0; i < 5; i++) { // safety cap
            const locator = page.getByRole('button', {name: /Load remaining\b \d+/i});
            const btn = locator.first();
            // Wait briefly for visibility; if not visible, stop.
            await btn.waitFor({state: 'visible', timeout: 2000}).catch(() => {});
            const visible = await btn.isVisible().catch(() => false);
            if (!visible) break;
            const enabled = await btn.isEnabled().catch(() => false);
            if (!enabled) break;
            const label = await btn.innerText().catch(() => '(unknown)');
            log.info('Clicking "%s"', label.trim());
            await btn.click();
            clickedAny = true;
            await waitForStableNetwork(page);
        }
        if (!clickedAny) {
            log.warn('No "Load remaining" button found');
        }
        return clickedAny;
    } catch (e) {
        log.error('Failed while handling "Load remaining": %s', e.message);
        return false;
    }
}


async function main() {
    log.info('Starting AoN Creatures Downloader...');
    const cfg = loadConfig();

    log.level = cfg.verbose ? 'trace' : 'info';
    log.info('Settings: %o', {
        pageUrl: cfg.pageUrl, out: cfg.out, headless: cfg.headless, keepOpen: cfg.keepOpen, keepOpenOnError: cfg.keepOpenOnError, slowMo: cfg.slowMo, userAgent: cfg.userAgent, verbose: cfg.verbose,
    });

    log.info('Launching browser and exporting via UI...');
    const targetPath = await exportCreaturesJsonViaUi({
        pageUrl: cfg.pageUrl, headless: cfg.headless, keepOpen: cfg.keepOpen, keepOpenOnError: cfg.keepOpenOnError, slowMo: cfg.slowMo, userAgent: cfg.userAgent, out: cfg.out,
    });
    log.info('Export completed. File saved to: %s', path.resolve(targetPath));

    // Build metadata next to the downloaded JSON
    const metadataPath = buildReport(targetPath);
    log.info('Metadata written to: %s', path.resolve(metadataPath));
}

main().catch((e) => {
    log.fatal('Fatal error: %s', e);
    process.exit(1);
});


// -------- Browser Management --------
async function withBrowser(headless, slowMo, userAgent, keepOpenOnError, downloadsPath, callback) {
    const browser = await chromium.launch({
        headless,
        slowMo,
        downloadsPath,
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 },
        userAgent: userAgent || undefined,
        acceptDownloads: true,
    });
    const page = await context.newPage();

    try {
        return await callback(page, context, browser);
    } catch (err) {
        // If an error occurs and we are in headed mode, optionally keep the browser open for investigation
        const shouldPause = !headless && !!keepOpenOnError;
        if (shouldPause) {
            log.error('Error occurred: %s', err && err.message ? err.message : String(err));
            await waitForEnter('An error occurred. Inspect the browser, then press Enter here to close it...');
        }
        throw err;
    } finally {
        await browser.close().catch(err2 => log.error('Browser cleanup failed:', err2));
    }
}

// -------- Helper Functions --------
async function clickButton(page, descriptors, errorMsg) {
    const btn = await findFirstVisible(page, descriptors);
    if (!btn) {
        throw new Error(`Fatal: ${errorMsg}`);
    }
    await btn.click();
    return btn;
}

async function downloadJson(page, exportBtn, outputPath) {
    const downloadPromise = page.waitForEvent('download', {timeout: 15000});
    await exportBtn.click();
    const download = await downloadPromise;
    const target = path.resolve(outputPath);

    try {
        // Wait for the download to complete and get the path
        const downloadPath = await download.path();
        if (!downloadPath) {
            throw new Error('Download failed - no file path received');
        }

        log.info('Downloaded to %s (suggested: %s)', downloadPath, download.suggestedFilename());

        // If download path is different from target, move it
        if (path.resolve(downloadPath) !== target) {
            fs.renameSync(downloadPath, target);
            log.info('Moved to %s', target);
        }

        return target;
    } catch (e) {
        log.error('Failed to save download: %s', e);
        await download.cancel().catch(() => {});
        throw e;
    }
}

async function waitForStableNetwork(page, timeout = 10000) {
    await page.waitForLoadState('networkidle', {timeout}).catch(() => {});
    await page.waitForLoadState('load', {timeout: 5000}).catch(() => {});
}

// -------- UI Export flow --------
async function exportCreaturesJsonViaUi({pageUrl, headless, keepOpen = false, keepOpenOnError = true, slowMo = 0, userAgent = null, out}) {
    log.info({headless: headless, slowMo: slowMo}, 'Starting UI export flow');

    // Prepare output directory as downloads path (required on Windows)
    const outputDir = path.dirname(path.resolve(out));
    fs.mkdirSync(outputDir, { recursive: true });

    return withBrowser(headless, slowMo, userAgent, keepOpenOnError, outputDir, async (page, context, browser) => {
        // Navigate
        log.trace('Navigating to %s', pageUrl);
        await page.goto(pageUrl, {waitUntil: 'domcontentloaded', timeout: 30000});
        await waitForStableNetwork(page);

        // Load all creatures
        const loaded = await tryLoadAll(page);
        if (!loaded) {
            throw new Error('Fatal: "Load remaining <number>" button not found');
        }

        // Show filters
        await clickButton(page, [
            {role: 'button', name: /Show filters and options/i},
            {role: 'link', name: /Show filters and options/i},
            {role: 'button', name: /Show Options/i},
        ], '"Show filters and options" button not found');
        await page.waitForLoadState('domcontentloaded');

        // Show result display menu
        await clickButton(page, [
            {role: 'button', name: /Result display/i},
            {role: 'button', name: /Result Display/i},
            {role: 'link', name: /Result display/i},
        ], '"Result display" button not found');
        await page.waitForLoadState('domcontentloaded');

        // Find export button
        const exportBtn = await findFirstVisible(page, [
            {role: 'button', name: /Export as JSON/i},
            {role: 'link', name: /Export as JSON/i},
            {text: /Export as JSON/i},
        ]);
        if (!exportBtn) {
            throw new Error('Fatal: "Export as JSON" button not found');
        }

        // Download and save
        const targetPath = await downloadJson(page, exportBtn, out);

        // Optional: keep open for debugging
        if (!headless && keepOpen) {
            log.info('Download saved to %s', targetPath);
            await waitForEnter('Press Enter to close browser...');
        }

        return targetPath;
    });
}

async function findFirstVisible(page, descriptors) {
    for (const d of descriptors) {
        try {
            let locator;
            if (d.text) {
                // Use getByText to support regex
                locator = page.getByText(d.text);
            } else if (d.role && d.name) {
                locator = page.getByRole(d.role, {name: d.name});
            }
            if (!locator) continue;
            const count = await locator.count();
            if (count === 0) continue;
            const el = locator.first();
            await el.waitFor({state: 'visible', timeout: 2000}).catch(() => {
            });
            if (await el.isVisible()) return el;
        } catch {
            // ignore and continue
        }
    }
    return null;
}
