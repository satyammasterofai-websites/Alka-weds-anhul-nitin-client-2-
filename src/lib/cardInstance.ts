/**
 * cardInstance.ts
 * Manages unique database identification, remix isolation, and URL synchronization.
 * Guarantees that this remixed website in AI Studio never overlaps or overwrites data
 * from the official website, the parent client website, or any other existing data pack.
 */

// Dedicated Applet and Remix Instance Details
export const THIS_APPLET_SUBDOMAIN = 'ecodenauz7oc2t6lmqu3hy';
export const THIS_APPLET_ID = '099a7184-2226-4c29-bd3b-194f77d00bdc';
export const CURRENT_REMIX_CARD_ID = 'remix-nitin-client-2-ecodenauz';
export const CURRENT_REMIX_WEBSITE_NAME = 'Remix Nitin sir client 2';

// Seed Template Details (Read-only source for initial copy, NEVER written to)
export const SEED_TEMPLATE_CARD_ID = 'nitin-sir-client-2';

// Protected Documents - CAN NEVER BE OVERWRITTEN, MUTATED, OR TARGETED BY THIS REMIX
export const PROTECTED_CARD_IDS: readonly string[] = Object.freeze([
  'official-wedding-card',
  'nitin-sir-client-2',
  'nitin sir client -2',
  'anshul-alka-2',
  'remix-v1',
  'default',
]);

/**
 * Returns true if the candidate cardId is protected and cannot be written to.
 */
export function isProtectedCardId(id: string): boolean {
  if (!id) return true;
  const lower = id.trim().toLowerCase();
  if (lower.includes('official')) return true;
  if (lower === 'nitin-sir-client-2' || lower === 'nitin sir client -2') return true;
  if (lower === 'anshul-alka-2' || lower === 'anshul & alka 2') return true;
  if (lower === 'remix-v1' || lower === 'default') return true;
  return PROTECTED_CARD_IDS.some(p => p.toLowerCase() === lower);
}

/**
 * Detects the AI Studio applet subdomain from window.location.hostname
 * e.g. "ais-dev-ecodenauz7oc2t6lmqu3hy-18224007398.asia-east1.run.app"
 */
export function detectAppletSubdomain(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  const hostname = window.location.hostname || '';
  const match = hostname.match(/^ais-(?:dev|pre)-([a-zA-Z0-9]+)/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Returns the website name based on active cardId
 */
export function getWebsiteName(targetCardId?: string): string {
  return CURRENT_REMIX_WEBSITE_NAME;
}

/**
 * Determines the appropriate card/database ID for this remix instance.
 * Strict Isolation Rules:
 * 1. URL search parameter (?id=, ?card=, ?remix=) takes precedence if specified,
 *    provided it is NOT one of the protected IDs.
 * 2. Saved preference in localStorage (wedding_remix_card_id) if specified and not protected.
 * 3. Otherwise defaults to the dedicated isolated remix database ID ('remix-nitin-client-2-ecodenauz').
 */
export function determineInitialCardId(): string {
  if (typeof window !== 'undefined') {
    // 1. Explicit URL parameter
    try {
      const params = new URLSearchParams(window.location.search);
      const queryId = params.get('id') || params.get('remix') || params.get('card');
      if (queryId && queryId.trim() !== '') {
        const trimmed = queryId.trim();
        // A remix is strictly forbidden from accessing or overwriting protected cards
        if (!isProtectedCardId(trimmed)) {
          return trimmed;
        }
        console.warn(`[DATA ISOLATION] Blocked protected ID '${trimmed}' from URL. Defaulting to '${CURRENT_REMIX_CARD_ID}'.`);
      }
    } catch (e) {
      console.warn('Error reading URL search params:', e);
    }

    // 2. Saved card ID preference from localStorage
    try {
      const savedCardId = localStorage.getItem('wedding_remix_card_id');
      if (savedCardId && savedCardId.trim() !== '') {
        const trimmed = savedCardId.trim();
        if (!isProtectedCardId(trimmed)) {
          return trimmed;
        }
      }
    } catch (e) {}
  }

  // Always default to dedicated isolated remix card ID
  return CURRENT_REMIX_CARD_ID;
}

/**
 * Security guard: ensures remix CAN NEVER write to official or parent master documents.
 * Automatically sanitizes and redirects any dangerous write to the isolated remix ID.
 */
export function sanitizeCardIdForSave(targetCardId: string): string {
  if (!targetCardId || isProtectedCardId(targetCardId)) {
    console.warn(`[DATA ISOLATION] Blocked save to protected database '${targetCardId}'. Redirected to isolated ID '${CURRENT_REMIX_CARD_ID}'.`);
    return CURRENT_REMIX_CARD_ID;
  }
  return targetCardId;
}

/**
 * Returns isolated localStorage key for a specific card ID
 */
export function getStorageKey(cardId: string): string {
  const safeId = sanitizeCardIdForSave(cardId);
  return `wedding-ecard-settings-${safeId}`;
}

/**
 * Saves settings to localStorage with strict card isolation
 */
export function saveToLocalStorage(cardId: string, settings: any): void {
  try {
    const safeCardId = sanitizeCardIdForSave(cardId);
    const dataStr = JSON.stringify(settings);
    localStorage.setItem(getStorageKey(safeCardId), dataStr);
  } catch (e) {
    console.warn(`Local storage quota exceeded or blocked for ${cardId}:`, e);
  }
}

/**
 * Gets settings from localStorage with strict card isolation
 */
export function getFromLocalStorage(cardId: string): any | null {
  try {
    const safeCardId = sanitizeCardIdForSave(cardId);
    const scoped = localStorage.getItem(getStorageKey(safeCardId));
    if (scoped) return JSON.parse(scoped);
  } catch (e) {
    console.warn(`Error reading localStorage for ${cardId}:`, e);
  }
  return null;
}

/**
 * Generates the full shareable URL with the card ID query param
 */
export function getShareableUrl(cardId: string): string {
  const safeId = sanitizeCardIdForSave(cardId);
  if (typeof window === 'undefined' || !window.location) return `?id=${safeId}`;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('id', safeId);
    return url.toString();
  } catch (e) {
    return `${window.location.origin}${window.location.pathname}?id=${safeId}`;
  }
}
