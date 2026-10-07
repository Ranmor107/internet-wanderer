export const GLOBAL_VOICES_LICENSE = 'https://creativecommons.org/licenses/by/3.0/';

export function isGlobalVoices(sourceId: string, url: string): boolean {
  if (sourceId === 'global-voices' || sourceId.startsWith('global-voices-')) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ['globalvoices.org', 'globalvoicesonline.org'].some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch { return false; }
}
