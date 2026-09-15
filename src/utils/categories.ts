import { NewsItem } from '../types.ts';

export interface CategoryInfo {
  id: string;
  name: string;
  icon?: string;
  keywords: string[];
}

export const MAIN_CATEGORIES: { id: string; name: string; keywords: string[]; urlPatterns: RegExp[] }[] = [
  {
    id: 'politik',
    name: 'Politik',
    urlPatterns: [/\/politik\b/i, /\/politics\b/i, /\/inland\/politik\b/i, /\/investigativ\b/i],
    keywords: [
      'politik', 'bundestag', 'bundesrat', 'bundeskanzler', 'kanzler', 'scholz', 'merz', 'habeck',
      'lindner', 'pistorius', 'steinmeier', 'baerbock', 'weidel', 'wagenknecht', 'söder', 'klingbeil',
      'koalition', 'ampel', 'cdu', 'csu', 'spd', 'grüne', 'bündnis 90', 'fdp', 'afd', 'bsw', 'linke',
      'wahl', 'wahlen', 'bundestagswahl', 'landtagswahl', 'wahlergebnis', 'minister', 'ministerium',
      'partei', 'parteitag', 'parlament', 'gesetz', 'gesetzentwurf', 'debatte', 'opposition', 'regierung',
      'kanzleramt', 'haushalt', 'bundesverfassungsgericht', 'diplomatie', 'gipfel', 'eu-kommission',
      'eu-gipfel', 'resolution', 'sanktionen', 'bundeswehr', 'verteidigung', 'staatsanwaltschaft',
      'ausschuss', 'staatssekretär', 'abgeordnete'
    ],
  },
  {
    id: 'wirtschaft',
    name: 'Wirtschaft',
    urlPatterns: [/\/wirtschaft\b/i, /\/finanzen\b/i, /\/economy\b/i, /\/boerse\b/i, /\/business\b/i, /\/unternehmen\b/i],
    keywords: [
      'wirtschaft', 'finanz', 'finanzen', 'unternehmen', 'konzern', 'aktie', 'aktien', 'dax', 'börse',
      'inflation', 'ezb', 'zinsen', 'leitzins', 'bank', 'banken', 'volkswagen', 'vw', 'bmw', 'mercedes',
      'siemens', 'sap', 'basf', 'bayer', 'insolvenz', 'pleite', 'gewinn', 'umsatz', 'quartalszahlen',
      'arbeitsmarkt', 'arbeitslosigkeit', 'tarif', 'tarife', 'tarifstreit', 'streik', 'gdl', 'verdi',
      'ig metall', 'energiepreise', 'gaspreis', 'strompreis', 'export', 'import', 'bip', 'bruttoinlandsprodukt',
      'rezession', 'finanzamt', 'steuern', 'steuer', 'haushaltsloch', 'milliarden', 'investition',
      'handelsabkommen', 'zölle', 'zoll', 'lieferkette', 'euro', 'dollar', 'krypto', 'bitcoin'
    ],
  },
  {
    id: 'inland',
    name: 'Inland',
    urlPatterns: [/\/inland\b/i, /\/deutschland\b/i, /\/bundeslaender\b/i, /\/regional\b/i, /\/germany\b/i],
    keywords: [
      'inland', 'deutschland', 'bundesweit', 'bundesland', 'bundesländer', 'polizei', 'bundespolizei',
      'feuerwehr', 'landtag', 'berlin', 'hamburg', 'münchen', 'köln', 'frankfurt', 'stuttgart',
      'düsseldorf', 'dresden', 'leipzig', 'hannover', 'nürnberg', 'bremen', 'bayern', 'nrw', 'sachsen',
      'hessen', 'baden-württemberg', 'thüringen', 'deutsche bahn', 'bahn', 'strecke', 'schienenverkehr',
      'kita', 'schulen', 'bildung', 'hochschule', 'flughafen', 'stau', 'verkehr', 'autobahn',
      'bürgermeister', 'stadtverwaltung'
    ],
  },
  {
    id: 'ausland',
    name: 'Ausland',
    urlPatterns: [/\/ausland\b/i, /\/international\b/i, /\/welt\b/i, /\/world\b/i, /\/europa\b/i, /\/europe\b/i],
    keywords: [
      'ausland', 'international', 'welt', 'global', 'usa', 'us-', 'amerika', 'washington', 'trump',
      'biden', 'weißes haus', 'pentagon', 'ukraine', 'russland', 'putin', 'selenskyj', 'kiew', 'moskau',
      'nahost', 'israel', 'gaza', 'netanjahu', 'hamas', 'hisbollah', 'iran', 'teheran', 'libanon', 'beirut',
      'syrien', 'china', 'peking', 'taiwan', 'asien', 'frankreich', 'paris', 'macron', 'großbritannien',
      'london', 'starmer', 'polen', 'italien', 'rom', 'meloni', 'türkei', 'erdogan', 'un-sicherheitsrat',
      'vereinte nationen', 'nato', 'nordkorea', 'südamerika', 'afrika'
    ],
  },
  {
    id: 'digital',
    name: 'Digital & Tech',
    urlPatterns: [/\/digital\b/i, /\/tech\b/i, /\/technologie\b/i, /\/it\b/i, /\/netzwelt\b/i, /\/technik-motor\b/i, /\/heise\b/i],
    keywords: [
      'digital', 'tech', 'technologie', 'it', 'ki', 'künstliche intelligenz', 'ai', 'chatgpt', 'openai',
      'google', 'apple', 'microsoft', 'meta', 'nvidia', 'amazon', 'smartphone', 'iphone', 'android',
      'app', 'cyber', 'cyberangriff', 'hacker', 'hackerangriff', 'it-sicherheit', 'sicherheitslücke',
      'software', 'hardware', 'chip', 'halbleiter', 'datenschutz', 'social media', 'tiktok', 'instagram',
      'youtube', 'roboter', 'robotik', 'algorithmus', 'browser', 'windows', 'linux', 'cloud', 'gaming',
      'playstation', 'nintendo', 'xbox', 'telekom', 'glasfaser', '5g'
    ],
  },
  {
    id: 'wissen',
    name: 'Wissen',
    urlPatterns: [/\/wissen\b/i, /\/wissenschaft\b/i, /\/forschung\b/i, /\/science\b/i, /\/gesundheit\b/i, /\/medizin\b/i],
    keywords: [
      'wissen', 'wissenschaft', 'forscher', 'forschung', 'studie', 'wissenschaftler', 'labor',
      'medizin', 'gesundheit', 'arzt', 'ärzte', 'krankenhaus', 'klinik', 'krebs', 'therapie', 'medikament',
      'impfung', 'impfstoff', 'virus', 'bakterien', 'gehirn', 'dna', 'genetik', 'raumfahrt', 'nasa',
      'esa', 'weltall', 'mars', 'mond', 'universum', 'teleskop', 'galaxie', 'astronaut', 'archäologie',
      'fund', 'ozean', 'tiefsee', 'biologie', 'physik', 'quanten', 'chemie', 'psychologie'
    ],
  },
  {
    id: 'klima',
    name: 'Klima & Umwelt',
    urlPatterns: [/\/klima\b/i, /\/umwelt\b/i, /\/wetter\b/i, /\/nature\b/i, /\/nachhaltigkeit\b/i],
    keywords: [
      'klima', 'klimawandel', 'klimakrise', 'erwärmung', 'co2', 'treibhausgas', 'emissionen',
      'erneuerbare', 'solaranlage', 'solarenergie', 'windkraft', 'windrad', 'umwelt', 'umweltschutz',
      'naturschutz', 'dürre', 'hochwasser', 'flut', 'orkan', 'sturm', 'unwetter', 'hitze', 'hitzewelle',
      'artensterben', 'biodiversität', 'waldbrand', 'waldbrände', 'gletscher', 'arktis', 'antarktis',
      'ökologie', 'nachhaltigkeit', 'meteorologie', 'dwd', 'wetterdienst'
    ],
  },
  {
    id: 'kultur',
    name: 'Kultur',
    urlPatterns: [/\/kultur\b/i, /\/feuilleton\b/i, /\/arts\b/i, /\/film\b/i, /\/kino\b/i, /\/musik\b/i, /\/literatur\b/i],
    keywords: [
      'kultur', 'kino', 'film', 'filme', 'kinofilm', 'oscar', 'oscars', 'berlinale', 'cannes',
      'hollywood', 'schauspieler', 'schauspielerin', 'regisseur', 'regie', 'serie', 'streaming',
      'netflix', 'musik', 'konzert', 'album', 'song', 'sänger', 'sängerin', 'band', 'pop', 'rock',
      'theater', 'oper', 'bühne', 'literatur', 'buch', 'bücher', 'autor', 'autorin', 'roman',
      'bestseller', 'ausstellung', 'museum', 'galerie', 'kunst', 'künstler', 'künstlerin',
      'gemälde', 'festival', 'architektur', 'design', 'denkmal'
    ],
  },
  {
    id: 'sport',
    name: 'Sport',
    urlPatterns: [/\/sport\b/i, /\/fussball\b/i, /\/bundesliga\b/i, /\/sports\b/i],
    keywords: [
      'sport', 'fußball', 'fussball', 'bundesliga', '2. bundesliga', 'champions league', 'europa league',
      'dfb', 'dfb-pokal', 'nationalmannschaft', 'nagelsmann', 'bayern münchen', 'fc bayern', 'bvb',
      'dortmund', 'leverkusen', 'leipzig', 'real madrid', 'barcelona', 'premier league', 'trainer',
      'olympia', 'olympische spiele', 'tennis', 'zverev', 'djokovic', 'alcaraz', 'formel 1', 'verstappen',
      'hamilton', 'motorsport', 'ski', 'wintersport', 'biathlon', 'skispringen', 'basketball', 'nba',
      'handball', 'nfl', 'leichtathletik', 'radsport', 'tour de france', 'golf', 'tabelle', 'spieltag'
    ],
  },
  {
    id: 'gesellschaft',
    name: 'Gesellschaft',
    urlPatterns: [/\/gesellschaft\b/i, /\/panorama\b/i, /\/leben\b/i, /\/lifestyle\b/i, /\/vermischtes\b/i],
    keywords: [
      'gesellschaft', 'panorama', 'vermischtes', 'kriminalität', 'mord', 'totschlag', 'raub', 'festnahme',
      'haftbefehl', 'prozess', 'gericht', 'landgericht', 'amtsgericht', 'urteil', 'fahndung', 'ermittlung',
      'unfall', 'verkehrsunfall', 'unglück', 'katastrophe', 'rettung', 'rettungskräfte', 'bevölkerung',
      'leben', 'alltag', 'familie', 'kinder', 'jugendliche', 'senioren', 'rente', 'wohnen', 'miete',
      'mieten', 'immobilien', 'prominente', 'leute', 'royals', 'königshaus'
    ],
  },
];

export const CATEGORY_NAMES: string[] = MAIN_CATEGORIES.map((c) => c.name);

/**
 * Normalizes or infers the most accurate category for a news article.
 */
export function inferNewsCategory(
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
    if (rawLower === 'politik' || rawLower.startsWith('politik') || rawLower.includes('innenpolitik') || rawLower.includes('außenpolitik')) {
      return 'Politik';
    }
    if (rawLower === 'wirtschaft' || rawLower.startsWith('wirtschaft') || rawLower.includes('finanzen') || rawLower.includes('börse')) {
      return 'Wirtschaft';
    }
    if (rawLower === 'sport' || rawLower.startsWith('sport') || rawLower.includes('fußball')) {
      return 'Sport';
    }
    if (rawLower === 'kultur' || rawLower.startsWith('kultur') || rawLower.includes('feuilleton')) {
      return 'Kultur';
    }
    if (rawLower === 'wissen' || rawLower.startsWith('wissen') || rawLower.includes('wissenschaft') || rawLower.includes('gesundheit')) {
      return 'Wissen';
    }
    if (rawLower === 'digital' || rawLower.includes('tech') || rawLower.includes('netzwelt') || rawLower.includes('it-')) {
      return 'Digital & Tech';
    }
    if (rawLower === 'klima' || rawLower.includes('umwelt') || rawLower.includes('wetter')) {
      return 'Klima & Umwelt';
    }
    if (rawLower === 'inland' || rawLower === 'deutschland') {
      return 'Inland';
    }
    if (rawLower === 'ausland' || rawLower === 'international' || rawLower === 'welt') {
      return 'Ausland';
    }
    if (rawLower === 'gesellschaft' || rawLower === 'panorama' || rawLower === 'leben') {
      return 'Gesellschaft';
    }
  }

  // 2. URL Path pattern check (highly accurate for German news sites)
  if (urlLower) {
    for (const cat of MAIN_CATEGORIES) {
      for (const pattern of cat.urlPatterns) {
        if (pattern.test(urlLower)) {
          return cat.name;
        }
      }
    }
  }

  // 3. Provider-specific strong defaults
  if (providerId === 'heise') {
    return 'Digital & Tech';
  }

  // 4. Keyword scoring analysis across title (high weight) and summary
  let highestScore = 0;
  let bestCategory = '';

  const titleLower = title.toLowerCase();

  for (const cat of MAIN_CATEGORIES) {
    let score = 0;

    for (const kw of cat.keywords) {
      // Title match gets higher weight
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

  // 5. Fallback based on raw category or provider default
  if (rawCategory && !['eilmeldung', 'aktuell', 'news', 'nachrichten', 'schlagzeilen', 'top-themen'].includes(rawLower)) {
    // Capitalize first letter properly
    return rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
  }

  if (providerId === 'dw') {
    return 'Ausland';
  }

  return 'Inland';
}

/**
 * Checks if a news item matches the selected category filter.
 */
export function matchesCategory(item: NewsItem, selectedCategory: string): boolean {
  if (!selectedCategory || selectedCategory === 'all') {
    return true;
  }

  if (selectedCategory === 'breaking') {
    return Boolean(item.isBreaking);
  }

  const selNorm = selectedCategory.trim().toLowerCase();
  const itemCat = (item.category || '').trim().toLowerCase();

  // Exact match
  if (itemCat === selNorm) {
    return true;
  }

  // Clean / alias matches
  if (selNorm === 'politik') {
    return (
      itemCat === 'politik' ||
      itemCat.includes('politik') ||
      itemCat === 'inland/politik' ||
      itemCat === 'bundestag' ||
      itemCat === 'koalition' ||
      itemCat === 'regierung' ||
      itemCat === 'wahlen'
    );
  }

  if (selNorm === 'wirtschaft') {
    return (
      itemCat === 'wirtschaft' ||
      itemCat.includes('wirtschaft') ||
      itemCat.includes('finanz') ||
      itemCat.includes('börse') ||
      itemCat.includes('unternehmen') ||
      itemCat.includes('markt')
    );
  }

  if (selNorm === 'inland') {
    return itemCat === 'inland' || itemCat === 'deutschland' || itemCat.includes('inland');
  }

  if (selNorm === 'ausland') {
    return (
      itemCat === 'ausland' ||
      itemCat === 'international' ||
      itemCat === 'welt' ||
      itemCat.includes('ausland') ||
      itemCat.includes('international')
    );
  }

  if (selNorm === 'digital & tech' || selNorm === 'digital' || selNorm === 'technologie' || selNorm === 'tech') {
    return (
      itemCat === 'digital & tech' ||
      itemCat === 'digital' ||
      itemCat === 'technologie' ||
      itemCat.includes('digital') ||
      itemCat.includes('tech') ||
      itemCat.includes('it')
    );
  }

  if (selNorm === 'wissen' || selNorm === 'wissenschaft') {
    return (
      itemCat === 'wissen' ||
      itemCat === 'wissenschaft' ||
      itemCat.includes('wissen') ||
      itemCat.includes('forschung') ||
      itemCat.includes('gesundheit') ||
      itemCat.includes('medizin')
    );
  }

  if (selNorm === 'klima & umwelt' || selNorm === 'klima' || selNorm === 'umwelt') {
    return (
      itemCat === 'klima & umwelt' ||
      itemCat === 'klima' ||
      itemCat === 'umwelt' ||
      itemCat.includes('klima') ||
      itemCat.includes('umwelt') ||
      itemCat.includes('wetter')
    );
  }

  if (selNorm === 'kultur') {
    return itemCat === 'kultur' || itemCat.includes('kultur') || itemCat.includes('feuilleton');
  }

  if (selNorm === 'sport') {
    return itemCat === 'sport' || itemCat.includes('sport') || itemCat.includes('fußball');
  }

  if (selNorm === 'gesellschaft' || selNorm === 'panorama' || selNorm === 'panorama & gesellschaft') {
    return (
      itemCat === 'gesellschaft' ||
      itemCat === 'panorama' ||
      itemCat === 'panorama & gesellschaft' ||
      itemCat.includes('gesellschaft') ||
      itemCat.includes('panorama')
    );
  }

  // Substring match for any other dynamic category tag
  return itemCat.includes(selNorm) || selNorm.includes(itemCat);
}
