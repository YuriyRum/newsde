import { XMLParser } from 'fast-xml-parser';
import { NewsItem } from '../types.ts';
import { GERMAN_NEWS_PROVIDERS } from '../data/providers.ts';
import { inferNewsCategory } from '../utils/categories.ts';
import { FALLBACK_NEWS_ITEMS } from '../data/fallbackNews.ts';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  cdataPropName: '__cdata',
});

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

function generateItemId(providerId: string, rawItem: any, link: string, title: string, index: number): string {
  const guidRaw =
    extractXmlText(rawItem?.guid) ||
    extractXmlText(rawItem?.id) ||
    extractXmlText(rawItem?.sophoraId) ||
    extractXmlText(rawItem?.externalId);
  const cleanGuid = guidRaw ? guidRaw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-60) : '';
  const cleanLink = link ? link.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-40) : '';
  const cleanTitle = title ? title.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) : '';

  if (cleanGuid && !cleanGuid.includes('object_Object')) {
    return `${providerId}-${cleanGuid}`;
  }
  if (cleanLink) {
    return `${providerId}-${cleanLink}`;
  }
  if (cleanTitle) {
    return `${providerId}-${cleanTitle}-${index}`;
  }
  return `${providerId}-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Check if the app is running in an environment with our Express server
 * (e.g. dev container or Cloud Run), vs a static host like Netlify
 */
function isBackendSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  // If hosted on netlify.app, github.io, vercel.app or custom static domain without express backend, return false
  if (host.includes('netlify.app') || host.includes('github.io') || host.includes('vercel.app')) {
    return false;
  }
  return host === 'localhost' || host === '127.0.0.1' || host.includes('.run.app');
}

/**
 * Direct Tagesschau API (Supports Direct Browser CORS natively!)
 */
async function fetchTagesschauDirect(): Promise<NewsItem[]> {
  try {
    const res = await fetch('https://www.tagesschau.de/api2u/news', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Tagesschau HTTP ${res.status}`);
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

/**
 * Fetch raw XML using JSON-wrapped CORS proxy (prevents browser direct CORS blocking)
 */
async function fetchXmlViaJsonProxy(targetUrl: string): Promise<string | null> {
  // Use AllOrigins JSON endpoint which always sends CORS headers to browser
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
    // Proxy timeout or rate-limited
  }

  return null;
}

/**
 * Parse standard RSS feed XML into NewsItem[]
 */
function parseRssFeed(xml: string, provider: (typeof GERMAN_NEWS_PROVIDERS)[0]): NewsItem[] {
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
 * Primary Client-Side SPA News Fetcher
 * Built specifically for Single Page Applications deployed on Netlify / static hosts.
 */
export async function fetchNewsFeed(selectedProviderIds: string[]): Promise<NewsItem[]> {
  const fallbackSubset = FALLBACK_NEWS_ITEMS.filter((item) =>
    selectedProviderIds.includes(item.providerId)
  );

  // 1. If running in full-stack dev container with Express backend, query /api/news
  if (isBackendSupported()) {
    try {
      const queryParams = new URLSearchParams({
        providers: selectedProviderIds.join(','),
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`/api/news?${queryParams.toString()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items) && data.items.length > 0) {
          return data.items;
        }
      }
    } catch {
      // Backend not responding, smoothly proceed to SPA client fetching
    }
  }

  // 2. Client-Side SPA Fetching (Tagesschau direct API + CORS proxy + built-in fallback)
  const providersToFetch = GERMAN_NEWS_PROVIDERS.filter((p) => selectedProviderIds.includes(p.id));
  const fetchPromises = providersToFetch.map(async (provider) => {
    try {
      // Tagesschau supports browser CORS directly without any proxy
      if (provider.id === 'tagesschau') {
        const tsItems = await fetchTagesschauDirect();
        if (tsItems.length > 0) return tsItems;
      }

      // Try JSON proxy wrapper for other feeds
      const xml = await fetchXmlViaJsonProxy(provider.feedUrl);
      if (xml) {
        const parsedItems = parseRssFeed(xml, provider);
        if (parsedItems.length > 0) return parsedItems;
      }
    } catch {
      // Silently catch to avoid console spam
    }

    // Provider curated items
    return FALLBACK_NEWS_ITEMS.filter((item) => item.providerId === provider.id);
  });

  const results = await Promise.allSettled(fetchPromises);
  const allItems: NewsItem[] = [];

  results.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      allItems.push(...res.value);
    }
  });

  if (allItems.length === 0) {
    return fallbackSubset.length > 0 ? fallbackSubset : FALLBACK_NEWS_ITEMS;
  }

  // Deduplicate and Sort
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const seenIds = new Set<string>();

  const deduplicated = allItems.filter((item, idx) => {
    const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (item.link && seenLinks.has(item.link)) return false;
    if (normalizedTitle && seenTitles.has(normalizedTitle)) return false;
    if (item.link) seenLinks.add(item.link);
    if (normalizedTitle) seenTitles.add(normalizedTitle);

    if (!item.id || typeof item.id !== 'string' || item.id.includes('[object')) {
      item.id = `${item.providerId || 'news'}-${Date.now()}-${idx}`;
    }
    if (seenIds.has(item.id)) {
      item.id = `${item.id}-${idx}`;
    }
    seenIds.add(item.id);
    return true;
  });

  // Sort descending by timestamp
  deduplicated.sort((a, b) => b.timestamp - a.timestamp);

  return deduplicated.length > 0
    ? deduplicated
    : (fallbackSubset.length > 0 ? fallbackSubset : FALLBACK_NEWS_ITEMS);
}
