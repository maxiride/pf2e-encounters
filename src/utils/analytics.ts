// Thin, safe wrapper around the Umami client — no-ops if the script didn't load (adblock, dev mode).
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  window.umami?.track(name, data);
}
