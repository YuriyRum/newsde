import { XMLParser } from 'fast-xml-parser';
import { NewsItem, NewsProvider } from '../types.ts';
import { GERMAN_NEWS_PROVIDERS } from '../data/providers.ts';
import { inferNewsCategory } from '../utils/categories.ts';
import { FALLBACK_NEWS_ITEMS } from '../data/fallbackNews.ts';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  cdataPropName: '__cdata',
});

// In-Memory cache for super-fast instant rendering
const providerCache = new Map<string, { items: NewsItem[]; timestamp: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes fresh cache

// Initialize cache with fallback items so initial render is instantaneous
FALLBACK_NEWS_ITEMS.forEach((item) => {
  if (!providerCache.has(item.providerId)) {
    const subset = FALLBACK_NEWS_ITEMS.filter((f) => f.providerId === item.providerId);
    providerCache.set(item.providerId, { items: subset, timestamp: Date.now() - 60000 });
  }
});

// Try to hydrate from localStorage for persistence across reloads
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem('news24_cached_feeds');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.entries(parsed).forEach(([pid, data]: [string, any]) => {
        if (Array.isArray(data?.items) && data.items.length > 0) {
          providerCache.set(pid, { items: data.items, timestamp: data.timestamp || Date.now() });
        }
      });
    }
  }
} catch {
  // ignore
}

function persistCacheToStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const obj: Record<string, any> = {};
      providerCache.forEach((val, key) => {
        obj[key] = { items: val.items.slice(0, 30), timestamp: val.timestamp };
      });
      localStorage.setItem('news24_cached_feeds', JSON.stringify(obj));
    }
  } catch {
    // ignore
  }
}

// Web Worker instance singleton (created lazily)
let newsWorker: Worker | null = null;
let workerAvailable = true;

function getNewsWorker(): Worker | null {
  if (!workerAvailable) return null;
  if (!newsWorker && typeof window !== 'undefined' && window.Worker) {
    try {
      newsWorker = new Worker(new URL('../workers/newsFeedWorker.ts', import.meta.url), {
        type: 'module',
      });
      newsWorker.onerror = () => {
        console.info('Web Worker not supported in this context, falling back to main-thread async worker.');
        workerAvailable = false;
        newsWorker = null;
      };
    } catch {
      workerAvailable = false;
      newsWorker = null;
    }
  }
  return newsWorker;
}

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8217;/g, '’')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8230;/g, '…')
    .trim();
}

function stripHtml(html: string): string {
  if (!html) return '';
  return decodeHtmlEntities(html.replace(/<[^>]*>?/gm, ' ')).replace(/\s+/g, ' ').trim();
}

function extractXmlText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node.trim();
  if (typeof node === 'number') return String(node);
  if (node.__cdata && typeof node.__cdata === 'string') return node.__cdata.trim();
  if (node['#text'] && typeof node['#text'] === 'string') return node['#text'].trim();
  if (node['@_href'] && typeof node['@_href'] === 'string') return node['@_href'].trim();
  if (node['@_url'] && typeof node['@_url'] === 'string') return node['@_url'].trim();
  if (Array.isArray(node) && node.length > 0) {
    for (const item of node) {
      const val = extractXmlText(item);
      if (val) return val;
    }
  }
  return '';
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function generateItemId(providerId: string, rawItem: any, link: string, title: string, index: number): string {
  const guidRaw =
    extractXmlText(rawItem?.guid) ||
    extractXmlText(rawItem?.id) ||
    extractXmlText(rawItem?.sophoraId) ||
    extractXmlText(rawItem?.externalId);
  const basis = guidRaw && !guidRaw.includes('object') ? guidRaw : link || title || `idx-${index}`;
  return `${providerId}-${hashString(basis)}`;
}

function isBackendSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host.includes('netlify.app') || host.includes('github.io') || host.includes('vercel.app')) {
    return false;
  }
  return host === 'localhost' || host === '127.0.0.1' || host.includes('.run.app');
}

/**
 * Direct Tagesschau API (Supports Direct Browser CORS natively in ~150ms)
 */
export async function fetchTagesschauDirect(): Promise<NewsItem[]> {
  try {
    const res = await fetch('https://www.tagesschau.de/api2u/news', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const newsList = data.news || [];
    const newsItems: NewsItem[] = [];

    for (let i = 0; i < newsList.length; i++) {
      const item = newsList[i];
      if (!item.title || !item.shareURL) continue;

      let imageUrl: string | undefined = undefined;
      const teaserImage = item.teaserImage;
      if (teaserImage?.imageVariants) {
        const variants = teaserImage.imageVariants;
        imageUrl =
          variants['16x9-960'] ||
          variants['16x9-640'] ||
          variants['16x9-512'] ||
          variants['16x9-384'] ||
          variants['1x1-840'] ||
          variants['1x1-512'];
      }

      const dateStr = item.date || item.externalId || new Date().toISOString();
      const parsedDate = new Date(dateStr);
      const timestamp = isNaN(parsedDate.getTime()) ? Date.now() - i * 60000 : parsedDate.getTime();
      const title = decodeHtmlEntities(item.title);
      const summary = decodeHtmlEntities(item.firstSentence || item.topline || '');
      const rawCat = item.topline || (item.tags && item.tags[0]?.tag) || '';
      const category = inferNewsCategory(title, summary, rawCat, item.shareURL, 'tagesschau');
      const id = generateItemId('ts', item, item.shareURL, title, i);

      newsItems.push({
        id,
        title,
        summary,
        link: item.shareURL,
        pubDate: isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
        timestamp,
        providerId: 'tagesschau',
        providerName: 'Tagesschau',
        providerBadgeBg: 'bg-blue-900 text-white border-blue-800',
        providerTextColor: '#002e7a',
        category,
        imageUrl,
        isBreaking: item.sophoraId?.includes('breaking') || title.toLowerCase().includes('eilmeldung'),
      });
    }
    return newsItems;
  } catch {
    return [];
  }
}

async function fetchXmlViaJsonProxy(targetUrl: string): Promise<string | null> {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.contents && (data.contents.includes('<rss') || data.contents.includes('<feed') || data.contents.includes('<channel'))) {
        return data.contents;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function parseRssFeed(xml: string, provider: NewsProvider): NewsItem[] {
  try {
    const parsed = parser.parse(xml);
    let items = parsed?.rss?.channel?.item || parsed?.feed?.entry || parsed?.['rdf:RDF']?.item || [];
    if (!Array.isArray(items)) {
      items = items ? [items] : [];
    }

    const newsItems: NewsItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it) continue;

      let rawTitle = it.title?.__cdata || it.title || '';
      if (typeof rawTitle === 'object') rawTitle = rawTitle['#text'] || '';
      const title = decodeHtmlEntities(rawTitle);
      if (!title) continue;

      let rawDesc =
        it.description?.__cdata ||
        it.description ||
        it.summary?.__cdata ||
        it.summary ||
        it['content:encoded']?.__cdata ||
        it['content:encoded'] ||
        '';
      if (typeof rawDesc === 'object') rawDesc = rawDesc['#text'] || '';
      const summary = stripHtml(rawDesc);

      let link = it.link?.__cdata || it.link || '';
      if (typeof link === 'object' && link['@_href']) {
        link = link['@_href'];
      } else if (typeof link === 'object' && link['#text']) {
        link = link['#text'];
      } else if (typeof link !== 'string') {
        link = '';
      }

      const pubDate = it.pubDate || it['dc:date'] || it.published || it.updated || new Date().toISOString();
      const parsedDate = new Date(pubDate);
      const timestamp = isNaN(parsedDate.getTime()) ? Date.now() - i * 60000 : parsedDate.getTime();

      let imageUrl: string | undefined = undefined;
      if (it.enclosure && it.enclosure['@_type']?.startsWith('image')) {
        imageUrl = it.enclosure['@_url'];
      } else if (it['media:content']) {
        imageUrl = it['media:content']['@_url'] || it['media:content'][0]?.['@_url'];
      } else if (it['media:thumbnail']) {
        imageUrl = it['media:thumbnail']['@_url'] || it['media:thumbnail'][0]?.['@_url'];
      }

      let rawCategory = '';
      if (it.category) {
        if (typeof it.category === 'string') rawCategory = decodeHtmlEntities(it.category);
        else if (Array.isArray(it.category) && it.category[0]) {
          rawCategory = decodeHtmlEntities(
            typeof it.category[0] === 'string' ? it.category[0] : it.category[0]['#text'] || ''
          );
        } else if (typeof it.category === 'object' && it.category['#text']) {
          rawCategory = decodeHtmlEntities(it.category['#text']);
        }
      }

      const category = inferNewsCategory(title, summary, rawCategory, link, provider.id);
      const isBreaking =
        title.toLowerCase().includes('eilmeldung') ||
        title.toLowerCase().includes('breaking') ||
        summary.toLowerCase().includes('eilmeldung');

      const id = generateItemId(provider.id, it, link, title, i);

      newsItems.push({
        id,
        title,
        summary,
        link,
        pubDate: isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
        timestamp,
        providerId: provider.id,
        providerName: provider.shortName,
        providerBadgeBg: provider.badgeBg,
        providerTextColor: provider.textColor,
        category,
        imageUrl,
        isBreaking,
      });
    }
    return newsItems;
  } catch {
    return [];
  }
}

/**
 * Fetch a single provider independently
 */
export async function fetchSingleProvider(providerId: string, forceRefresh = false): Promise<NewsItem[]> {
  const provider = GERMAN_NEWS_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return [];

  // Check cache if not force refresh
  if (!forceRefresh && providerCache.has(providerId)) {
    const cached = providerCache.get(providerId)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS && cached.items.length > 0) {
      return cached.items;
    }
  }

  // 1. Tagesschau special handling (Super fast direct CORS)
  if (providerId === 'tagesschau') {
    try {
      const items = await fetchTagesschauDirect();
      if (items.length > 0) {
        providerCache.set(providerId, { items, timestamp: Date.now() });
        persistCacheToStorage();
        return items;
      }
    } catch {
      // fallback
    }
  }

  // 2. Try Web Worker for background processing
  const worker = getNewsWorker();
  if (worker) {
    try {
      const workerResult = await new Promise<NewsItem[]>((resolve) => {
        const requestId = `${providerId}-${Date.now()}-${Math.random()}`;
        const timeout = setTimeout(() => {
          cleanup();
          resolve([]);
        }, 5000);

        const handleMsg = (e: MessageEvent) => {
          if (e.data?.requestId === requestId) {
            cleanup();
            resolve(e.data.items || []);
          }
        };

        const cleanup = () => {
          clearTimeout(timeout);
          worker.removeEventListener('message', handleMsg);
        };

        worker.addEventListener('message', handleMsg);
        worker.postMessage({
          type: 'FETCH_PROVIDER',
          provider,
          requestId,
        });
      });

      if (workerResult && workerResult.length > 0) {
        providerCache.set(providerId, { items: workerResult, timestamp: Date.now() });
        persistCacheToStorage();
        return workerResult;
      }
    } catch {
      // fallback to main thread
    }
  }

  // 3. Main thread fallback
  try {
    const xml = await fetchXmlViaJsonProxy(provider.feedUrl);
    if (xml) {
      const items = parseRssFeed(xml, provider);
      if (items.length > 0) {
        providerCache.set(providerId, { items, timestamp: Date.now() });
        persistCacheToStorage();
        return items;
      }
    }
  } catch {
    // fallback
  }

  // 4. Return curated fallback items
  const fallback = FALLBACK_NEWS_ITEMS.filter((item) => item.providerId === providerId);
  providerCache.set(providerId, { items: fallback, timestamp: Date.now() });
  return fallback;
}

/**
 * Get Instant Initial State for Selected Providers (0ms latency!)
 */
export function getInstantCachedNews(selectedProviderIds: string[]): NewsItem[] {
  const items: NewsItem[] = [];
  selectedProviderIds.forEach((pid) => {
    if (providerCache.has(pid)) {
      items.push(...providerCache.get(pid)!.items);
    } else {
      const fallback = FALLBACK_NEWS_ITEMS.filter((f) => f.providerId === pid);
      items.push(...fallback);
    }
  });

  return deduplicateAndSortNews(items);
}

export function deduplicateAndSortNews(items: NewsItem[]): NewsItem[] {
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const seenIds = new Set<string>();

  const deduplicated = items.filter((item, idx) => {
    const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (item.link && seenLinks.has(item.link)) return false;
    if (normalizedTitle && seenTitles.has(normalizedTitle)) return false;
    if (item.link) seenLinks.add(item.link);
    if (normalizedTitle) seenTitles.add(normalizedTitle);

    if (!item.id || typeof item.id !== 'string' || item.id.includes('[object')) {
      item.id = `${item.providerId || 'news'}-${hashString(item.link || item.title || `item-${idx}`)}`;
    }
    if (seenIds.has(item.id)) {
      return false;
    }
    seenIds.add(item.id);
    return true;
  });

  deduplicated.sort((a, b) => b.timestamp - a.timestamp);
  return deduplicated;
}

/**
 * Streaming Feed Aggregator:
 * Loads tiles INDEPENDENTLY and delivers clean, smooth updates
 */
export function streamNewsFeed(
  selectedProviderIds: string[],
  options: {
    forceRefresh?: boolean;
    onProviderLoaded: (providerId: string, items: NewsItem[], allCurrentItems: NewsItem[]) => void;
    onAllFinished: (allItems: NewsItem[]) => void;
  }
): () => void {
  let isCancelled = false;
  const currentProviderItems = new Map<string, NewsItem[]>();

  // 1. Initialize with cached items immediately for 0ms visual rendering
  selectedProviderIds.forEach((pid) => {
    if (providerCache.has(pid)) {
      currentProviderItems.set(pid, providerCache.get(pid)!.items);
    } else {
      const fallback = FALLBACK_NEWS_ITEMS.filter((f) => f.providerId === pid);
      currentProviderItems.set(pid, fallback);
    }
  });

  const getCombinedItems = () => {
    const all: NewsItem[] = [];
    currentProviderItems.forEach((list) => all.push(...list));
    return deduplicateAndSortNews(all);
  };

  // 2. Fetch every provider independently in parallel
  let completedCount = 0;
  const total = selectedProviderIds.length;

  selectedProviderIds.forEach(async (providerId) => {
    try {
      const items = await fetchSingleProvider(providerId, options.forceRefresh);
      if (isCancelled) return;

      if (items && items.length > 0) {
        currentProviderItems.set(providerId, items);
      }

      completedCount++;
      const currentCombined = getCombinedItems();
      options.onProviderLoaded(providerId, items, currentCombined);

      if (completedCount >= total) {
        options.onAllFinished(currentCombined);
      }
    } catch {
      if (isCancelled) return;
      completedCount++;
      const currentCombined = getCombinedItems();
      if (completedCount >= total) {
        options.onAllFinished(currentCombined);
      }
    }
  });

  // Return cancel function
  return () => {
    isCancelled = true;
  };
}

/**
 * Standard Promise wrapper for single-call needs
 */
export async function fetchNewsFeed(selectedProviderIds: string[]): Promise<NewsItem[]> {
  return new Promise((resolve) => {
    streamNewsFeed(selectedProviderIds, {
      onAllFinished: (items) => resolve(items),
      onProviderLoaded: () => {},
    });
  });
}
