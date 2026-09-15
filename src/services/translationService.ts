/**
 * Translation service for German -> Russian news text
 * Features high-performance multi-tier fallbacks and instant persistent caching.
 */

const MEMORY_CACHE = new Map<string, string>();
const LOCAL_STORAGE_CACHE_KEY = 'deutschland_news_translations_ru_v1';

// Load stored translations from localStorage on startup
try {
  const stored = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === 'string') {
        MEMORY_CACHE.set(k, v);
      }
    });
  }
} catch {
  // Ignore localStorage parsing errors
}

function saveCacheToStorage() {
  try {
    const obj: Record<string, string> = {};
    let count = 0;
    // Store recent up to 400 entries to prevent quota overflow
    for (const [k, v] of MEMORY_CACHE.entries()) {
      if (count++ > 400) break;
      obj[k] = v;
    }
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore storage quota errors
  }
}

function normalizeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 300);
}

/**
 * Translates a single German text string to Russian.
 */
export async function translateTextToRussian(text: string): Promise<string> {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();
  const cacheKey = normalizeKey(trimmed);

  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey)!;
  }

  // Tier 1: Try local backend /api/translate
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, from: 'de', to: 'ru' }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.translation) {
        MEMORY_CACHE.set(cacheKey, data.translation);
        saveCacheToStorage();
        return data.translation;
      }
    }
  } catch {
    // Continue to next tier
  }

  // Tier 2: Free Google Translate GTX API
  try {
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=ru&dt=t&q=${encodeURIComponent(
      trimmed
    )}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(gtxUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const fullTranslation = data[0].map((chunk: any) => chunk[0] || '').join('');
        if (fullTranslation && fullTranslation.trim()) {
          const result = fullTranslation.trim();
          MEMORY_CACHE.set(cacheKey, result);
          saveCacheToStorage();
          return result;
        }
      }
    }
  } catch {
    // Continue to next tier
  }

  // Tier 3: MyMemory free translation API
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      trimmed.slice(0, 500)
    )}&langpair=de|ru`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(myMemoryUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText) {
        const result = data.responseData.translatedText.trim();
        // Check for MyMemory warning response
        if (!result.includes('MYMEMORY WARNING') && !result.includes('QUERY LENGTH LIMIT')) {
          MEMORY_CACHE.set(cacheKey, result);
          saveCacheToStorage();
          return result;
        }
      }
    }
  } catch {
    // Return original text on complete failure
  }

  return trimmed;
}

/**
 * Translates an array of paragraphs or sentences in parallel.
 */
export async function translateParagraphsToRussian(paragraphs: string[]): Promise<string[]> {
  if (!paragraphs || paragraphs.length === 0) return [];

  const promises = paragraphs.map((p) => translateTextToRussian(p));
  return Promise.all(promises);
}

/**
 * Returns cached translation if already available synchronously
 */
export function getCachedTranslation(text: string): string | null {
  if (!text) return null;
  const key = normalizeKey(text);
  return MEMORY_CACHE.get(key) || null;
}
