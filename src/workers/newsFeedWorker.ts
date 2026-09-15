import { XMLParser } from 'fast-xml-parser';
import { NewsItem, NewsProvider } from '../types.ts';
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

async function fetchTagesschauDirect(): Promise<NewsItem[]> {
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
    const timeoutId = setTimeout(() => controller.abort(), 4500);
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

function parseRssXml(xml: string, provider: NewsProvider): NewsItem[] {
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

async function processSingleProvider(provider: NewsProvider): Promise<NewsItem[]> {
  try {
    if (provider.id === 'tagesschau') {
      const tsItems = await fetchTagesschauDirect();
      if (tsItems && tsItems.length > 0) return tsItems;
    }

    const xml = await fetchXmlViaJsonProxy(provider.feedUrl);
    if (xml) {
      const items = parseRssXml(xml, provider);
      if (items && items.length > 0) return items;
    }
  } catch {
    // Fallback
  }

  return FALLBACK_NEWS_ITEMS.filter((item) => item.providerId === provider.id);
}

// Web Worker message listener
self.addEventListener('message', async (e: MessageEvent) => {
  const { type, provider, requestId } = e.data || {};

  if (type === 'FETCH_PROVIDER' && provider) {
    try {
      const items = await processSingleProvider(provider);
      self.postMessage({
        type: 'PROVIDER_LOADED',
        requestId,
        providerId: provider.id,
        items,
        success: true,
      });
    } catch (err: any) {
      const fallback = FALLBACK_NEWS_ITEMS.filter((item) => item.providerId === provider.id);
      self.postMessage({
        type: 'PROVIDER_LOADED',
        requestId,
        providerId: provider.id,
        items: fallback,
        success: false,
        error: err?.message,
      });
    }
  }
});
