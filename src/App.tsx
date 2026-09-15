/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NewsItem, ViewLayout, ThemeMode, FontSize } from './types.ts';
import { GERMAN_NEWS_PROVIDERS } from './data/providers.ts';
import { Header } from './components/Header.tsx';
import { ProviderPillsBar } from './components/ProviderPillsBar.tsx';
import { CategoryChipsBar } from './components/CategoryChipsBar.tsx';
import { NewsTile } from './components/NewsTile.tsx';
import { ProviderSelectorModal } from './components/ProviderSelectorModal.tsx';
import { ArticleReaderModal } from './components/ArticleReaderModal.tsx';
import { SavedArticlesDrawer } from './components/SavedArticlesDrawer.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { CATEGORY_NAMES, matchesCategory } from './utils/categories.ts';
import { streamNewsFeed, getInstantCachedNews } from './services/newsService.ts';
import { FALLBACK_NEWS_ITEMS } from './data/fallbackNews.ts';
import {
  RotateCw,
  SlidersHorizontal,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Radio,
  Clock,
  Sparkles,
  ArrowUp,
  Inbox,
  Loader2,
} from 'lucide-react';

const DEFAULT_PROVIDERS = ['tagesschau', 'dw', 'zdf', 'dlf', 'spiegel', 'zeit'];

export default function App() {
  // --- Persistent State ---
  const [selectedProviders, setSelectedProviders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('deutschland_news_providers');
      return saved ? JSON.parse(saved) : DEFAULT_PROVIDERS;
    } catch {
      return DEFAULT_PROVIDERS;
    }
  });

  const [viewLayout, setViewLayout] = useState<ViewLayout>(() => {
    try {
      const saved = localStorage.getItem('deutschland_news_layout');
      return (saved as ViewLayout) || 'tiles';
    } catch {
      return 'tiles';
    }
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('deutschland_news_theme');
      return (saved as ThemeMode) || 'light';
    } catch {
      return 'light';
    }
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    try {
      const saved = localStorage.getItem('deutschland_news_fontsize');
      return (saved as FontSize) || 'base';
    } catch {
      return 'base';
    }
  });

  const [savedArticles, setSavedArticles] = useState<NewsItem[]>(() => {
    try {
      const saved = localStorage.getItem('deutschland_news_saved');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --- Dynamic Feed State (Initialized instantly with cached/offline items for 0ms visual delay) ---
  const [items, setItems] = useState<NewsItem[]>(() => {
    try {
      const savedProviders = localStorage.getItem('deutschland_news_providers');
      const provs = savedProviders ? JSON.parse(savedProviders) : DEFAULT_PROVIDERS;
      return getInstantCachedNews(provs);
    } catch {
      return getInstantCachedNews(DEFAULT_PROVIDERS);
    }
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadingProviders, setLoadingProviders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => new Date());

  // --- Filters & Modals State ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isProviderModalOpen, setIsProviderModalOpen] = useState<boolean>(false);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState<boolean>(false);
  const [activeReaderItem, setActiveReaderItem] = useState<NewsItem | null>(null);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('deutschland_news_providers', JSON.stringify(selectedProviders));
  }, [selectedProviders]);

  useEffect(() => {
    localStorage.setItem('deutschland_news_layout', viewLayout);
  }, [viewLayout]);

  useEffect(() => {
    localStorage.setItem('deutschland_news_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('deutschland_news_fontsize', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('deutschland_news_saved', JSON.stringify(savedArticles));
  }, [savedArticles]);

  // Apply theme to document element and body
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove('dark', 'theme-sepia');
    body.classList.remove('dark', 'theme-sepia');
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else if (theme === 'sepia') {
      root.classList.add('theme-sepia');
      body.classList.add('theme-sepia');
    }
  }, [theme]);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch News progressively via WebWorker / independent stream
  const fetchNews = useCallback(
    (forceRefresh = false) => {
      if (selectedProviders.length === 0) {
        setItems([]);
        setLoading(false);
        setLoadingProviders([]);
        return () => {};
      }

      if (forceRefresh) {
        setIsRefreshing(true);
      }
      setError(null);
      setLoadingProviders([...selectedProviders]);

      const cancel = streamNewsFeed(selectedProviders, {
        forceRefresh,
        onProviderLoaded: (providerId, _provItems, allCurrentItems) => {
          setLoadingProviders((prev) => prev.filter((p) => p !== providerId));
          setItems(allCurrentItems);
          setLoading(false);
          setLastUpdated(new Date());
        },
        onAllFinished: (allItems) => {
          setItems(allItems);
          setLoading(false);
          setIsRefreshing(false);
          setLoadingProviders([]);
          setLastUpdated(new Date());
        },
      });

      return cancel;
    },
    [selectedProviders]
  );

  // Trigger fetch whenever provider selection changes
  useEffect(() => {
    const cancel = fetchNews();
    return () => {
      if (typeof cancel === 'function') cancel();
    };
  }, [fetchNews]);

  // Auto-refresh every 5 minutes in background
  useEffect(() => {
    const timer = setInterval(() => {
      fetchNews(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchNews]);

  // Toggle single provider from pill bar
  const handleToggleProvider = (providerId: string) => {
    setSelectedProviders((prev) => {
      if (prev.includes(providerId)) {
        if (prev.length === 1) return prev; // Do not allow 0 providers
        return prev.filter((p) => p !== providerId);
      } else {
        return [...prev, providerId];
      }
    });
  };

  // Bookmark toggle
  const handleToggleBookmark = (item: NewsItem) => {
    setSavedArticles((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (exists) {
        return prev.filter((p) => p.id !== item.id);
      } else {
        return [item, ...prev];
      }
    });
  };

  const handleRemoveSaved = (id: string) => {
    setSavedArticles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllSaved = () => {
    setSavedArticles([]);
  };

  // Compute Categories from news and compute counts for each
  const { categories, categoryCounts, breakingNewsItems } = useMemo(() => {
    const breaking: NewsItem[] = [];
    const counts: Record<string, number> = {};

    // Initialize counts for main standard categories
    CATEGORY_NAMES.forEach((catName) => {
      counts[catName] = 0;
    });

    items.forEach((item) => {
      if (item.isBreaking) {
        breaking.push(item);
      }

      // Tally for main categories using matching logic
      CATEGORY_NAMES.forEach((catName) => {
        if (matchesCategory(item, catName)) {
          counts[catName] = (counts[catName] || 0) + 1;
        }
      });
    });

    // Only include categories that actually have articles
    const activeCategories = CATEGORY_NAMES.filter((catName) => (counts[catName] || 0) > 0);

    return {
      categories: activeCategories.length > 0 ? activeCategories : CATEGORY_NAMES.slice(0, 8),
      categoryCounts: counts,
      breakingNewsItems: breaking,
    };
  }, [items]);

  // Filtered News items based on search and category
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter using robust fuzzy & keyword matching
      if (selectedCategory === 'breaking') {
        if (!item.isBreaking) return false;
      } else if (selectedCategory !== 'all') {
        if (!matchesCategory(item, selectedCategory)) {
          return false;
        }
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSummary = item.summary.toLowerCase().includes(q);
        const matchProvider = item.providerName.toLowerCase().includes(q);
        const matchCategory = item.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchProvider && !matchCategory) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedCategory, searchQuery]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cycleViewLayout = () => {
    if (viewLayout === 'tiles') setViewLayout('compact');
    else if (viewLayout === 'compact') setViewLayout('headline');
    else setViewLayout('tiles');
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors pb-20 sm:pb-12">
      {/* Top Main Navigation Header */}
      <Header
        onOpenProvidersModal={() => setIsProviderModalOpen(true)}
        selectedProvidersCount={selectedProviders.length}
        totalProvidersCount={GERMAN_NEWS_PROVIDERS.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewLayout={viewLayout}
        onViewLayoutChange={setViewLayout}
        theme={theme}
        onThemeChange={setTheme}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchNews(true)}
        savedCount={savedArticles.length}
        onOpenSaved={() => setIsSavedDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 w-full flex-1">
        {/* Sticky Filters & Providers Strip */}
        <section className="mb-4 space-y-1">
          {/* Quick Provider Selection Pills */}
          <ProviderPillsBar
            selectedProviders={selectedProviders}
            loadingProviders={loadingProviders}
            onToggleProvider={handleToggleProvider}
            onOpenModal={() => setIsProviderModalOpen(true)}
          />

          {/* Topic Category Filter Chips */}
          <CategoryChipsBar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            breakingCount={breakingNewsItems.length}
            totalCount={items.length}
            categoryCounts={categoryCounts}
          />
        </section>

        {/* Breaking News Banner (if present and user is viewing all) */}
        {breakingNewsItems.length > 0 && selectedCategory === 'all' && (
          <div
            id="breaking-news-banner"
            onClick={() => setActiveReaderItem(breakingNewsItems[0])}
            className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all flex items-start sm:items-center justify-between gap-3 group"
          >
            <div className="flex items-start sm:items-center gap-3">
              <span className="p-2 rounded-xl bg-white/20 backdrop-blur-xs shrink-0">
                <Zap className="w-5 h-5 fill-current animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-white text-red-700 px-2 py-0.5 rounded">
                    Eilmeldung
                  </span>
                  <span className="text-xs font-semibold text-white/90">
                    {breakingNewsItems[0].providerName}
                  </span>
                </div>
                <h2 className="font-serif font-bold text-sm sm:text-base text-white mt-1 group-hover:underline">
                  {breakingNewsItems[0].title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold shrink-0 transition-colors"
            >
              Jetzt lesen
            </button>
          </div>
        )}

        {/* Live Status & Article Counts Bar */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-4 pb-2 border-b border-stone-200/80 dark:border-stone-800/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              {filteredItems.length} {filteredItems.length === 1 ? 'Meldung' : 'Meldungen'}
            </span>
            {searchQuery && (
              <span className="italic">für „{searchQuery}“</span>
            )}
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold hover:bg-amber-200 transition-colors cursor-pointer"
                title="Filter zurücksetzen"
              >
                <span>{selectedCategory === 'breaking' ? 'Eilmeldungen' : selectedCategory}</span>
                <span className="text-xs opacity-60 hover:opacity-100 font-bold">×</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden sm:inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Aktualisiert um {lastUpdated.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
              </span>
            )}
            <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Werbefreie Ansicht</span>
            </div>
          </div>
        </div>

        {/* Loading State Skeleton (Only shown when initial items are empty) */}
        {loading && items.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 py-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4 animate-pulse"
              >
                <div className="w-full aspect-16/9 bg-stone-200 dark:bg-stone-800 rounded-xl" />
                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-1/3" />
                <div className="h-6 bg-stone-200 dark:bg-stone-800 rounded w-4/5" />
                <div className="h-12 bg-stone-100 dark:bg-stone-800/60 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error Notification */}
        {error && items.length === 0 && (
          <div className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Nachrichten konnten nicht geladen werden
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400">{error}</p>
            <button
              id="btn-retry-fetch"
              type="button"
              onClick={() => fetchNews(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-stone-950 font-bold text-xs hover:bg-amber-300 transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" /> Erneut versuchen
            </button>
          </div>
        )}

        {/* Empty Search / Filter Results */}
        {!loading && filteredItems.length === 0 && !error && (
          <div className="py-20 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7 stroke-1" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Keine Nachrichten gefunden
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {searchQuery
                ? `Keine Ergebnisse für „${searchQuery}“. Versuche einen anderen Suchbegriff.`
                : 'Aktuell liegen in dieser Kategorie oder für die gewählten Quellen keine Einträge vor.'}
            </p>
            <div className="flex justify-center gap-2 pt-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold"
                >
                  Suche zurücksetzen
                </button>
              )}
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-stone-950 text-xs font-bold"
                >
                  Alle Themen anzeigen
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main News Tiles Presentation Grid / List (Renders progressively as streams arrive) */}
        {filteredItems.length > 0 && (
          <div
            id="news-tiles-grid"
            className={
              viewLayout === 'tiles'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6'
                : viewLayout === 'compact'
                ? 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-4.5'
                : 'flex flex-col space-y-2.5 max-w-4xl mx-auto'
            }
          >
            {filteredItems.map((item) => {
              const isBookmarked = savedArticles.some((p) => p.id === item.id);
              return (
                <NewsTile
                  key={item.id}
                  item={item}
                  layout={viewLayout}
                  fontSize={fontSize}
                  isBookmarked={isBookmarked}
                  onToggleBookmark={handleToggleBookmark}
                  onOpenReader={setActiveReaderItem}
                  onSelectCategory={setSelectedCategory}
                />
              );
            })}
          </div>
        )}

        {/* Footer info note */}
        <footer className="mt-14 pt-8 pb-4 border-t border-stone-200 dark:border-stone-800 text-center text-xs text-stone-400 dark:text-stone-600 space-y-2">
          <p className="flex items-center justify-center gap-1.5 font-medium text-stone-500 dark:text-stone-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Deutschland News Aggregator – Werbefreier Qualitätsjournalismus
          </p>
          <p className="text-[11px]">
            Inhalte und Urheberrechte liegen bei Tagesschau (ARD), Deutsche Welle (DW), ZDF, DLF, Spiegel, ZEIT, SZ, FAZ, taz und Heise.
          </p>
        </footer>
      </main>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          id="btn-scroll-to-top"
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-20 sm:bottom-8 right-5 z-40 p-3 rounded-full bg-stone-900 text-white dark:bg-amber-400 dark:text-stone-950 shadow-xl hover:scale-105 active:scale-95 transition-all"
          aria-label="Nach oben scrollen"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        onOpenProvidersModal={() => setIsProviderModalOpen(true)}
        selectedProvidersCount={selectedProviders.length}
        savedCount={savedArticles.length}
        onOpenSaved={() => setIsSavedDrawerOpen(true)}
        viewLayout={viewLayout}
        onCycleViewLayout={cycleViewLayout}
        onScrollToTop={scrollToTop}
      />

      {/* Multiple Choice Provider Modal */}
      <ProviderSelectorModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        selectedProviders={selectedProviders}
        onChange={(newProviders) => setSelectedProviders(newProviders)}
      />

      {/* Ad-Free Reader Modal */}
      <ArticleReaderModal
        item={activeReaderItem}
        onClose={() => setActiveReaderItem(null)}
        isBookmarked={
          activeReaderItem ? savedArticles.some((p) => p.id === activeReaderItem.id) : false
        }
        onToggleBookmark={handleToggleBookmark}
        onSelectCategory={setSelectedCategory}
      />

      {/* Saved Bookmarks Drawer */}
      <SavedArticlesDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        savedItems={savedArticles}
        onRemoveSaved={handleRemoveSaved}
        onClearAll={handleClearAllSaved}
        onOpenReader={setActiveReaderItem}
      />
    </div>
  );
}
