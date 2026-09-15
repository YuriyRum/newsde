export type AppLanguage = 'de' | 'ru';

export interface NewsProvider {
  id: string;
  name: string;
  shortName: string;
  category: 'public' | 'press' | 'tech' | 'international';
  categoryLabel: string;
  description: string;
  website: string;
  feedUrl: string;
  accentColor: string;
  textColor: string;
  badgeBg: string;
  logoText: string;
  isDefault: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  link: string;
  pubDate: string;
  timestamp: number;
  providerId: string;
  providerName: string;
  providerBadgeBg: string;
  providerTextColor: string;
  category?: string;
  imageUrl?: string;
  isBreaking?: boolean;
  translatedTitle?: string;
  translatedSummary?: string;
}

export type ViewLayout = 'tiles' | 'compact' | 'headline';
export type ThemeMode = 'light' | 'dark' | 'sepia';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface FilterState {
  selectedProviders: string[];
  searchQuery: string;
  selectedCategory: string;
  viewLayout: ViewLayout;
  sortBy: 'latest' | 'oldest';
  fontSize: FontSize;
  theme: ThemeMode;
  language: AppLanguage;
}
