import React, { useState } from 'react';
import { ViewLayout, ThemeMode, FontSize } from '../types.ts';
import {
  Newspaper,
  RotateCw,
  Search,
  X,
  LayoutGrid,
  List,
  AlignLeft,
  Sun,
  Moon,
  Coffee,
  Bookmark,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  onOpenProvidersModal: () => void;
  selectedProvidersCount: number;
  totalProvidersCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewLayout: ViewLayout;
  onViewLayoutChange: (layout: ViewLayout) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  fontSize: FontSize;
  onFontSizeChange: (size: FontSize) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  savedCount: number;
  onOpenSaved: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenProvidersModal,
  selectedProvidersCount,
  totalProvidersCount,
  searchQuery,
  onSearchChange,
  viewLayout,
  onViewLayoutChange,
  theme,
  onThemeChange,
  fontSize,
  onFontSizeChange,
  isRefreshing,
  onRefresh,
  savedCount,
  onOpenSaved,
}) => {
  const [showSearchMobile, setShowSearchMobile] = useState(false);

  const cycleTheme = () => {
    if (theme === 'light') onThemeChange('dark');
    else if (theme === 'dark') onThemeChange('sepia');
    else onThemeChange('light');
  };

  const cycleFontSize = () => {
    if (fontSize === 'sm') onFontSizeChange('base');
    else if (fontSize === 'base') onFontSizeChange('lg');
    else if (fontSize === 'lg') onFontSizeChange('xl');
    else onFontSizeChange('sm');
  };

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-30 bg-white/90 dark:bg-stone-900/90 sepia-bg-header backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-stone-900 dark:bg-amber-400 text-stone-100 dark:text-stone-950 flex items-center justify-center shadow-xs">
              <Newspaper className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-stone-900 dark:text-stone-100">
                  Deutschland News
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
                  <ShieldCheck className="w-3 h-3" /> Werbefrei
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:block">
                Tagesschau • DW • ZDF • DLF • Spiegel & Qualitätsmedien
              </p>
            </div>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                id="search-input-desktop"
                type="text"
                placeholder="Nachrichten nach Begriffen filtern..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-400/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Actions & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Toggle */}
            <button
              id="btn-toggle-search-mobile"
              type="button"
              onClick={() => setShowSearchMobile(!showSearchMobile)}
              className="md:hidden p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
              aria-label="Suche öffnen"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Provider Multiple Choice Filter Button */}
            <button
              id="btn-open-providers-header"
              type="button"
              onClick={onOpenProvidersModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold transition-all border border-stone-200 dark:border-stone-700"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Quellen:</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-400 text-stone-950 font-black text-[11px]">
                {selectedProvidersCount}/{totalProvidersCount}
              </span>
            </button>

            {/* Layout Switcher (Tiles / Compact / Headline) */}
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              <button
                id="btn-layout-tiles"
                type="button"
                onClick={() => onViewLayoutChange('tiles')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewLayout === 'tiles'
                    ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
                title="Kacheln (Magazinansicht)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                id="btn-layout-compact"
                type="button"
                onClick={() => onViewLayoutChange('compact')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewLayout === 'compact'
                    ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
                title="Kompaktliste"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                id="btn-layout-headline"
                type="button"
                onClick={() => onViewLayoutChange('headline')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewLayout === 'headline'
                    ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
                title="Schlagzeilen-Liste"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Font Size Quick Switcher */}
            <button
              id="btn-switch-font-size"
              type="button"
              onClick={cycleFontSize}
              className="p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-xs font-bold"
              title={`Schriftgröße anpassen (Aktuell: ${fontSize.toUpperCase()})`}
            >
              <span className="font-serif">A{fontSize === 'xl' ? '++' : fontSize === 'lg' ? '+' : ''}</span>
            </button>

            {/* Theme Toggle (Light / Dark / Sepia) */}
            <button
              id="btn-toggle-theme"
              type="button"
              onClick={cycleTheme}
              className="p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
              title={`Design wechseln (${theme})`}
            >
              {theme === 'light' ? (
                <Sun className="w-4.5 h-4.5 text-amber-500" />
              ) : theme === 'dark' ? (
                <Moon className="w-4.5 h-4.5 text-indigo-400" />
              ) : (
                <Coffee className="w-4.5 h-4.5 text-amber-700" />
              )}
            </button>

            {/* Saved Bookmarks Button */}
            <button
              id="btn-open-saved-header"
              type="button"
              onClick={onOpenSaved}
              className="relative p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
              title="Gespeicherte Artikel"
            >
              <Bookmark className="w-4.5 h-4.5" />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-stone-950 font-bold text-[10px] flex items-center justify-center">
                  {savedCount}
                </span>
              )}
            </button>

            {/* Refresh Button */}
            <button
              id="btn-refresh-feed"
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all disabled:opacity-50"
              title="Nachrichten aktualisieren"
            >
              <RotateCw className={`w-4.5 h-4.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Expansion */}
        {showSearchMobile && (
          <div className="md:hidden pb-3 pt-1">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                id="search-input-mobile"
                type="text"
                placeholder="Nachrichten filtern..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
