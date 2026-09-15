import express from 'express';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory feed cache: providerId -> { data: NewsItem[], timestamp: number }
interface CachedFeed {
  items: any[];
  timestamp: number;
}
const feedCache = new Map<string, CachedFeed>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  cdataPropName: '__cdata',
});

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
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

function stripHtml(html: string): string {
  if (!html) return '';
  return decodeHtmlEntities(html.replace(/<[^>]*>?/gm, ' ')).replace(/\s+/g, ' ').trim();
}

function extractImageFromHtml(html: string): string | undefined {
  if (!html) return undefined;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

const CATEGORY_RULES: { name: string; urlPatterns: RegExp[]; keywords: string[] }[] = [
  {
    name: 'Politik',
    urlPatterns: [/\/politik\b/i, /\/politics\b/i, /\/inland\/politik\b/i, /\/investigativ\b/i],
    keywords: [
      'politik', 'bundestag', 'bundesrat', 'bundeskanzler', 'kanzler', 'scholz', 'merz', 'habeck',
      'lindner', 'pistorius', 'steinmeier', 'baerbock', 'weidel', 'wagenknecht', 'söder', 'klingbeil',
      'koalition', 'ampel', 'cdu', 'csu', 'spd', 'grüne', 'bündnis 90', 'fdp', 'afd', 'bsw', 'linke',
      'wahl', 'wahlen', 'bundestagswahl', 'landtagswahl', 'wahlergebnis', 'minister', 'ministerium',
      'partei', 'parteitag', 'parlament', 'gesetz', 'gesetzentwurf', 'debatte', 'opposition', 'regierung',
      'kanzleramt', 'haushalt', 'bundesverfassungsgericht', 'diplomatie', 'gipfel', 'eu-kommission',
      'eu-gipfel', 'resolution', 'sanktionen', 'bundeswehr', 'verteidigung', 'abgeordnete'
    ],
  },
  {
    name: 'Wirtschaft',
    urlPatterns: [/\/wirtschaft\b/i, /\/finanzen\b/i, /\/economy\b/i, /\/boerse\b/i, /\/business\b/i, /\/unternehmen\b/i],
    keywords: [
      'wirtschaft', 'finanz', 'finanzen', 'unternehmen', 'konzern', 'aktie', 'aktien', 'dax', 'börse',
      'inflation', 'ezb', 'zinsen', 'leitzins', 'bank', 'banken', 'volkswagen', 'vw', 'bmw', 'mercedes',
      'siemens', 'sap', 'basf', 'bayer', 'insolvenz', 'pleite', 'gewinn', 'umsatz', 'quartalszahlen',
      'arbeitsmarkt', 'arbeitslosigkeit', 'tarif', 'tarife', 'tarifstreit', 'streik', 'gdl', 'verdi',
      'ig metall', 'energiepreise', 'gaspreis', 'strompreis', 'export', 'import', 'bip', 'rezession',
      'finanzamt', 'steuern', 'steuer', 'milliarden', 'investition', 'handelsabkommen', 'zölle', 'zoll'
    ],
  },
  {
    name: 'Inland',
    urlPatterns: [/\/inland\b/i, /\/deutschland\b/i, /\/bundeslaender\b/i, /\/regional\b/i, /\/germany\b/i],
    keywords: [
      'inland', 'deutschland', 'bundesweit', 'bundesland', 'bundesländer', 'polizei', 'bundespolizei',
      'feuerwehr', 'landtag', 'berlin', 'hamburg', 'münchen', 'köln', 'frankfurt', 'stuttgart',
      'düsseldorf', 'dresden', 'leipzig', 'hannover', 'nürnberg', 'bremen', 'bayern', 'nrw', 'sachsen',
      'hessen', 'baden-württemberg', 'thüringen', 'deutsche bahn', 'bahn', 'strecke', 'schienenverkehr',
      'kita', 'schulen', 'bildung', 'flughafen', 'verkehr', 'autobahn'
    ],
  },
  {
    name: 'Ausland',
    urlPatterns: [/\/ausland\b/i, /\/international\b/i, /\/welt\b/i, /\/world\b/i, /\/europa\b/i, /\/europe\b/i],
    keywords: [
      'ausland', 'international', 'welt', 'global', 'usa', 'us-', 'amerika', 'washington', 'trump',
      'biden', 'weißes haus', 'pentagon', 'ukraine', 'russland', 'putin', 'selenskyj', 'kiew', 'moskau',
      'nahost', 'israel', 'gaza', 'netanjahu', 'hamas', 'hisbollah', 'iran', 'teheran', 'libanon', 'beirut',
      'syrien', 'china', 'peking', 'taiwan', 'asien', 'frankreich', 'paris', 'macron', 'großbritannien',
      'london', 'starmer', 'polen', 'italien', 'rom', 'türkei', 'erdogan', 'nato', 'un-sicherheitsrat'
    ],
  },
  {
    name: 'Digital & Tech',
    urlPatterns: [/\/digital\b/i, /\/tech\b/i, /\/technologie\b/i, /\/it\b/i, /\/netzwelt\b/i, /\/technik-motor\b/i, /\/heise\b/i],
    keywords: [
      'digital', 'tech', 'technologie', 'it', 'ki', 'künstliche intelligenz', 'ai', 'chatgpt', 'openai',
      'google', 'apple', 'microsoft', 'meta', 'nvidia', 'amazon', 'smartphone', 'iphone', 'android',
      'app', 'cyber', 'cyberangriff', 'hacker', 'hackerangriff', 'it-sicherheit', 'sicherheitslücke',
      'software', 'hardware', 'chip', 'halbleiter', 'datenschutz', 'social media', 'tiktok', 'instagram',
      'youtube', 'roboter', 'robotik', 'gaming'
    ],
  },
  {
    name: 'Wissen',
    urlPatterns: [/\/wissen\b/i, /\/wissenschaft\b/i, /\/forschung\b/i, /\/science\b/i, /\/gesundheit\b/i, /\/medizin\b/i],
    keywords: [
      'wissen', 'wissenschaft', 'forscher', 'forschung', 'studie', 'wissenschaftler', 'labor',
      'medizin', 'gesundheit', 'arzt', 'ärzte', 'krankenhaus', 'klinik', 'krebs', 'therapie', 'medikament',
      'impfung', 'impfstoff', 'virus', 'bakterien', 'gehirn', 'dna', 'genetik', 'raumfahrt', 'nasa',
      'esa', 'weltall', 'mars', 'mond', 'universum', 'teleskop', 'archäologie', 'biologie', 'physik', 'chemie'
    ],
  },
  {
    name: 'Klima & Umwelt',
    urlPatterns: [/\/klima\b/i, /\/umwelt\b/i, /\/wetter\b/i, /\/nature\b/i, /\/nachhaltigkeit\b/i],
    keywords: [
      'klima', 'klimawandel', 'klimakrise', 'erwärmung', 'co2', 'treibhausgas', 'emissionen',
      'erneuerbare', 'solaranlage', 'solarenergie', 'windkraft', 'umwelt', 'umweltschutz', 'naturschutz',
      'dürre', 'hochwasser', 'flut', 'orkan', 'sturm', 'unwetter', 'hitze', 'hitzewelle', 'artensterben',
      'waldbrand', 'waldbrände', 'nachhaltigkeit', 'wetter'
    ],
  },
  {
    name: 'Kultur',
    urlPatterns: [/\/kultur\b/i, /\/feuilleton\b/i, /\/arts\b/i, /\/film\b/i, /\/kino\b/i, /\/musik\b/i, /\/literatur\b/i],
    keywords: [
      'kultur', 'kino', 'film', 'filme', 'kinofilm', 'oscar', 'berlinale', 'cannes', 'hollywood',
      'schauspieler', 'schauspielerin', 'regisseur', 'serie', 'streaming', 'netflix', 'musik', 'konzert',
      'album', 'sänger', 'theater', 'oper', 'literatur', 'buch', 'bücher', 'autor', 'roman', 'bestseller',
      'ausstellung', 'museum', 'kunst', 'künstler', 'festival'
    ],
  },
  {
    name: 'Sport',
    urlPatterns: [/\/sport\b/i, /\/fussball\b/i, /\/bundesliga\b/i, /\/sports\b/i],
    keywords: [
      'sport', 'fußball', 'fussball', 'bundesliga', 'champions league', 'dfb', 'nationalmannschaft',
      'nagelsmann', 'bayern münchen', 'fc bayern', 'bvb', 'dortmund', 'leverkusen', 'real madrid',
      'olympia', 'tennis', 'zverev', 'formel 1', 'verstappen', 'motorsport', 'ski', 'wintersport',
      'basketball', 'handball', 'nfl', 'radsport'
    ],
  },
  {
    name: 'Gesellschaft',
    urlPatterns: [/\/gesellschaft\b/i, /\/panorama\b/i, /\/leben\b/i, /\/lifestyle\b/i, /\/vermischtes\b/i],
    keywords: [
      'gesellschaft', 'panorama', 'vermischtes', 'kriminalität', 'mord', 'raub', 'festnahme',
      'prozess', 'gericht', 'urteil', 'fahndung', 'unfall', 'unglück', 'katastrophe', 'rettung',
      'leben', 'alltag', 'familie', 'kinder', 'senioren', 'wohnen', 'miete', 'mieten', 'leute', 'prominente'
    ],
  },
];

function inferNewsCategory(
  title: string,
  summary: string = '',
  rawCategory: string = '',
  link: string = '',
  providerId: string = ''
): string {
  const fullText = `${title} ${summary} ${rawCategory}`.toLowerCase();
  const urlLower = (link || '').toLowerCase();
  const rawLower = (rawCategory || '').trim().toLowerCase();

  // 1. Direct rawCategory clean mapping if already specific
  if (rawLower) {
    if (rawLower === 'politik' || rawLower.startsWith('politik') || rawLower.includes('innenpolitik') || rawLower.includes('außenpolitik')) return 'Politik';
    if (rawLower === 'wirtschaft' || rawLower.startsWith('wirtschaft') || rawLower.includes('finanzen') || rawLower.includes('börse')) return 'Wirtschaft';
    if (rawLower === 'sport' || rawLower.startsWith('sport') || rawLower.includes('fußball')) return 'Sport';
    if (rawLower === 'kultur' || rawLower.startsWith('kultur') || rawLower.includes('feuilleton')) return 'Kultur';
    if (rawLower === 'wissen' || rawLower.startsWith('wissen') || rawLower.includes('wissenschaft') || rawLower.includes('gesundheit')) return 'Wissen';
    if (rawLower === 'digital' || rawLower.includes('tech') || rawLower.includes('netzwelt') || rawLower.includes('it-')) return 'Digital & Tech';
    if (rawLower === 'klima' || rawLower.includes('umwelt') || rawLower.includes('wetter')) return 'Klima & Umwelt';
    if (rawLower === 'inland' || rawLower === 'deutschland') return 'Inland';
    if (rawLower === 'ausland' || rawLower === 'international' || rawLower === 'welt') return 'Ausland';
    if (rawLower === 'gesellschaft' || rawLower === 'panorama' || rawLower === 'leben') return 'Gesellschaft';
  }

  // 2. URL Path pattern check
  if (urlLower) {
    for (const cat of CATEGORY_RULES) {
      for (const pattern of cat.urlPatterns) {
        if (pattern.test(urlLower)) {
          return cat.name;
        }
      }
    }
  }

  // 3. Provider-specific fixed mappings
  if (providerId === 'heise') {
    return 'Digital & Tech';
  }

  // 4. Keyword scoring analysis
  let highestScore = 0;
  let bestCategory = '';
  const titleLower = title.toLowerCase();

  for (const cat of CATEGORY_RULES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (titleLower.includes(kw)) {
        score += kw.length > 5 ? 3 : 2;
      } else if (fullText.includes(kw)) {
        score += 1;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestCategory = cat.name;
    }
  }

  if (highestScore >= 2 && bestCategory) {
    return bestCategory;
  }

  if (rawCategory && !['eilmeldung', 'aktuell', 'news', 'nachrichten', 'schlagzeilen', 'top-themen'].includes(rawLower)) {
    return rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
  }

  if (providerId === 'dw') {
    return 'Ausland';
  }

  return 'Inland';
}

// Fetchers per provider
async function fetchTagesschauNews(): Promise<any[]> {
  try {
    const res = await fetch('https://www.tagesschau.de/api2u/news/', {
      headers: { 'User-Agent': 'DeutschlandNewsApp/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Tagesschau API error ${res.status}`);
    const data = await res.json();
    const newsItems: any[] = [];

    const newsList = data.news || [];
    for (let i = 0; i < newsList.length; i++) {
      const item = newsList[i];
      if (!item.title || !item.shareURL) continue;

      let imageUrl: string | undefined = undefined;
      if (item.teaserImage?.videowebl?.imageurl) {
        imageUrl = item.teaserImage.videowebl.imageurl;
      } else if (item.teaserImage?.videowebm?.imageurl) {
        imageUrl = item.teaserImage.videowebm.imageurl;
      } else if (item.teaserImage?.imageVariants) {
        const variants = item.teaserImage.imageVariants;
        imageUrl = variants['16x9-960'] || variants['16x9-640'] || variants['16x9-512'];
      }

      const isBreaking = Boolean(
        item.topline?.toLowerCase().includes('eilmeldung') ||
        item.title?.toLowerCase().includes('eilmeldung') ||
        item.type === 'breaking' ||
        item.isBreakingNews
      );

      const pubDate = item.date || new Date().toISOString();
      const title = decodeHtmlEntities(item.title);
      const summary = decodeHtmlEntities(item.firstSentence || item.topline || '');
      const rawCat = item.topline || (item.tags && item.tags[0]?.tag) || '';
      const category = inferNewsCategory(title, summary, rawCat, item.shareURL, 'tagesschau');
      const id = generateItemId('ts', item, item.shareURL, title, i);

      newsItems.push({
        id,
        title: title,
        summary: summary,
        link: item.shareURL,
        pubDate: pubDate,
        timestamp: new Date(pubDate).getTime() || Date.now(),
        providerId: 'tagesschau',
        providerName: 'Tagesschau',
        providerBadgeBg: 'bg-blue-900 text-white border-blue-800',
        providerTextColor: '#002e7a',
        category: category,
        imageUrl: imageUrl,
        isBreaking: isBreaking,
      });
    }

    return newsItems;
  } catch (err) {
    console.error('Error fetching Tagesschau API, falling back to RSS:', err);
    return fetchGenericRss(
      'https://www.tagesschau.de/xml/rss2/',
      'tagesschau',
      'Tagesschau',
      'bg-blue-900 text-white border-blue-800',
      '#002e7a',
      'Inland'
    );
  }
}

async function fetchDWNews(): Promise<any[]> {
  try {
    // Deutsche Welle German top/all RSS feed
    const res = await fetch('https://rss.dw.com/xml/rss-de-all', {
      headers: { 'User-Agent': 'DeutschlandNewsApp/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`DW RSS error ${res.status}`);
    const xmlText = await res.text();
    const parsed = xmlParser.parse(xmlText);

    const channel = parsed.rss?.channel || parsed['rdf:RDF'];
    const items = channel?.item || [];
    const itemArray = Array.isArray(items) ? items : [items];

    const newsItems: any[] = [];
    for (let i = 0; i < itemArray.length; i++) {
      const it = itemArray[i];
      if (!it) continue;

      let rawTitle = it.title?.__cdata || it.title || '';
      if (typeof rawTitle === 'object') rawTitle = rawTitle['#text'] || '';
      const title = decodeHtmlEntities(rawTitle);
      if (!title) continue;

      let rawDesc = it.description?.__cdata || it.description || '';
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

      const pubDate = it.pubDate || it['dc:date'] || new Date().toISOString();

      let imageUrl: string | undefined = undefined;
      if (it.enclosure && it.enclosure['@_url']) {
        imageUrl = it.enclosure['@_url'];
      } else if (it['media:content'] && it['media:content']['@_url']) {
        imageUrl = it['media:content']['@_url'];
      } else if (it['media:thumbnail'] && it['media:thumbnail']['@_url']) {
        imageUrl = it['media:thumbnail']['@_url'];
      } else {
        imageUrl = extractImageFromHtml(rawDesc);
      }

      let rawCat = '';
      if (it.category) {
        if (typeof it.category === 'string') rawCat = decodeHtmlEntities(it.category);
        else if (Array.isArray(it.category) && it.category[0]) {
          rawCat = decodeHtmlEntities(typeof it.category[0] === 'string' ? it.category[0] : it.category[0]['#text'] || '');
        } else if (typeof it.category === 'object' && it.category['#text']) {
          rawCat = decodeHtmlEntities(it.category['#text']);
        }
      }
      const category = inferNewsCategory(title, summary, rawCat, link, 'dw');
      const id = generateItemId('dw', it, link, title, i);

      newsItems.push({
        id,
        title,
        summary,
        link,
        pubDate,
        timestamp: new Date(pubDate).getTime() || Date.now(),
        providerId: 'dw',
        providerName: 'Deutsche Welle',
        providerBadgeBg: 'bg-sky-600 text-white border-sky-500',
        providerTextColor: '#0097ec',
        category,
        imageUrl,
        isBreaking: title.toLowerCase().includes('eilmeldung'),
      });
    }

    return newsItems;
  } catch (err) {
    console.error('Error fetching DW news:', err);
    return [];
  }
}

async function fetchGenericRss(
  feedUrl: string,
  providerId: string,
  providerName: string,
  badgeBg: string,
  textColor: string,
  defaultCategory: string
): Promise<any[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) throw new Error(`Feed error ${res.status} for ${providerName}`);
    const xmlText = await res.text();
    const parsed = xmlParser.parse(xmlText);

    let items: any[] = [];
    if (parsed.rss?.channel?.item) {
      items = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];
    } else if (parsed.feed?.entry) {
      // Atom feed (e.g. Heise)
      items = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
    } else if (parsed['rdf:RDF']?.item) {
      items = Array.isArray(parsed['rdf:RDF'].item)
        ? parsed['rdf:RDF'].item
        : [parsed['rdf:RDF'].item];
    }

    const newsItems: any[] = [];
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

      let link = it.link;
      if (typeof link === 'object' && link['@_href']) {
        link = link['@_href'];
      } else if (typeof link === 'object' && link['#text']) {
        link = link['#text'];
      } else if (typeof link !== 'string') {
        link = '';
      }

      const pubDate =
        it.pubDate || it.published || it.updated || it['dc:date'] || new Date().toISOString();

      let imageUrl: string | undefined = undefined;
      if (it.enclosure && it.enclosure['@_url']) {
        imageUrl = it.enclosure['@_url'];
      } else if (it['media:content']) {
        const mc = Array.isArray(it['media:content']) ? it['media:content'][0] : it['media:content'];
        imageUrl = mc?.['@_url'];
      } else if (it['media:thumbnail']) {
        const mt = Array.isArray(it['media:thumbnail']) ? it['media:thumbnail'][0] : it['media:thumbnail'];
        imageUrl = mt?.['@_url'];
      } else {
        imageUrl = extractImageFromHtml(rawDesc);
      }

      let rawCategory = defaultCategory;
      if (it.category) {
        if (typeof it.category === 'string') {
          rawCategory = decodeHtmlEntities(it.category);
        } else if (Array.isArray(it.category) && it.category[0]) {
          rawCategory = decodeHtmlEntities(
            typeof it.category[0] === 'string' ? it.category[0] : it.category[0]['#text'] || defaultCategory
          );
        } else if (typeof it.category === 'object' && it.category['#text']) {
          rawCategory = decodeHtmlEntities(it.category['#text']);
        }
      }

      const category = inferNewsCategory(title, summary, rawCategory, link, providerId);

      const isBreaking = Boolean(
        title.toLowerCase().includes('eilmeldung') ||
        title.toLowerCase().includes('breaking') ||
        summary.toLowerCase().includes('eilmeldung')
      );

      const id = generateItemId(providerId, it, link, title, i);

      newsItems.push({
        id,
        title,
        summary,
        link,
        pubDate,
        timestamp: new Date(pubDate).getTime() || Date.now(),
        providerId,
        providerName,
        providerBadgeBg: badgeBg,
        providerTextColor: textColor,
        category,
        imageUrl,
        isBreaking,
      });
    }

    return newsItems;
  } catch (err) {
    console.error(`Error fetching RSS for ${providerName} (${feedUrl}):`, err);
    return [];
  }
}

async function getProviderNews(providerId: string, forceRefresh = false): Promise<any[]> {
  const cached = feedCache.get(providerId);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.items;
  }

  let items: any[] = [];
  switch (providerId) {
    case 'tagesschau':
      items = await fetchTagesschauNews();
      break;
    case 'dw':
      items = await fetchDWNews();
      break;
    case 'zdf':
      items = await fetchGenericRss(
        'https://www.zdf.de/rss/zdf/nachrichten',
        'zdf',
        'ZDF heute',
        'bg-orange-600 text-white border-orange-500',
        '#fa7d00',
        'Aktuell'
      );
      break;
    case 'dlf':
      items = await fetchGenericRss(
        'https://www.deutschlandfunk.de/nachrichten-100.rss',
        'dlf',
        'Deutschlandfunk',
        'bg-teal-800 text-white border-teal-700',
        '#005f73',
        'Nachrichten'
      );
      break;
    case 'spiegel':
      items = await fetchGenericRss(
        'https://www.spiegel.de/schlagzeilen/tops/index.rss',
        'spiegel',
        'Der Spiegel',
        'bg-red-700 text-white border-red-600',
        '#e64415',
        'Schlagzeilen'
      );
      break;
    case 'zeit':
      items = await fetchGenericRss(
        'https://newsfeed.zeit.de/index',
        'zeit',
        'ZEIT ONLINE',
        'bg-stone-900 text-stone-100 border-stone-800',
        '#1c1917',
        'Politik & Gesellschaft'
      );
      break;
    case 'sz':
      items = await fetchGenericRss(
        'https://rss.sueddeutsche.de/alles',
        'sz',
        'Süddeutsche Zeitung',
        'bg-indigo-950 text-white border-indigo-900',
        '#1d3557',
        'Deutschland'
      );
      break;
    case 'faz':
      items = await fetchGenericRss(
        'https://www.faz.net/rss/aktuell/',
        'faz',
        'FAZ',
        'bg-slate-800 text-white border-slate-700',
        '#2b2d42',
        'Aktuell'
      );
      break;
    case 'taz':
      items = await fetchGenericRss(
        'https://taz.de/rss.xml',
        'taz',
        'taz',
        'bg-rose-800 text-white border-rose-700',
        '#b91c1c',
        'Gesellschaft'
      );
      break;
    case 'heise':
      items = await fetchGenericRss(
        'https://www.heise.de/rss/heise-atom.xml',
        'heise',
        'Heise Online',
        'bg-amber-700 text-white border-amber-600',
        '#d97706',
        'Technologie'
      );
      break;
    default:
      items = [];
  }

  feedCache.set(providerId, {
    items,
    timestamp: Date.now(),
  });

  return items;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/news', async (req, res) => {
  try {
    const providersQuery = (req.query.providers as string) || 'tagesschau,dw,zdf,dlf,spiegel,zeit';
    const forceRefresh = req.query.refresh === 'true';
    const providerList = providersQuery
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    // Fetch in parallel across all requested providers
    const results = await Promise.allSettled(
      providerList.map((id) => getProviderNews(id, forceRefresh))
    );

    let allItems: any[] = [];
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allItems = allItems.concat(result.value);
      }
    });

    // Deduplicate by URL or normalized Title
    const seenLinks = new Set<string>();
    const seenTitles = new Set<string>();
    const seenIds = new Set<string>();
    const deduplicated = allItems.filter((item, idx) => {
      const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (item.link && seenLinks.has(item.link)) return false;
      if (normalizedTitle && seenTitles.has(normalizedTitle)) return false;
      if (item.link) seenLinks.add(item.link);
      if (normalizedTitle) seenTitles.add(normalizedTitle);

      // Ensure unique string ID
      if (!item.id || typeof item.id !== 'string' || item.id.includes('[object')) {
        item.id = `${item.providerId || 'news'}-${Date.now()}-${idx}`;
      }
      if (seenIds.has(item.id)) {
        item.id = `${item.id}-${idx}`;
      }
      seenIds.add(item.id);
      return true;
    });

    // Sort by timestamp descending
    deduplicated.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      count: deduplicated.length,
      updatedAt: new Date().toISOString(),
      items: deduplicated,
    });
  } catch (err: any) {
    console.error('Error fetching aggregated news:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news feeds',
      message: err?.message,
    });
  }
});

// Ad-Free Reader Extract API
app.get('/api/article-reader', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing article url' });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      throw new Error(`Failed to load article from source (${response.status})`);
    }

    const html = await response.text();

    // Extract Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/ - [^-]+$/, '').trim()) : '';

    // Extract Main Lead & Paragraphs
    const paragraphs: string[] = [];
    const pMatches = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    for (const match of pMatches) {
      const pText = stripHtml(match[1]);
      // Filter out cookies, ads, copyright boilerplate
      if (
        pText.length > 50 &&
        !pText.toLowerCase().includes('cookie') &&
        !pText.toLowerCase().includes('datenschutz') &&
        !pText.toLowerCase().includes('werbung') &&
        !pText.toLowerCase().includes('newsletter abonnieren') &&
        !pText.toLowerCase().includes('alle rechte vorbehalten') &&
        !pText.toLowerCase().includes('javascript ist deaktiviert')
      ) {
        paragraphs.push(pText);
      }
    }

    // Lead image
    const ogImageMatch = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
    const leadImage = ogImageMatch ? ogImageMatch[1] : undefined;

    res.json({
      success: true,
      title,
      paragraphs: paragraphs.slice(0, 15),
      leadImage,
      sourceUrl: targetUrl,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Could not extract clean article text',
      message: err?.message,
    });
  }
});

async function startServer() {
  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Deutschland News server running on http://localhost:${PORT}`);
  });
}

startServer();
