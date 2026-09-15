import React from 'react';
import { Newspaper, SlidersHorizontal, Bookmark, LayoutGrid } from 'lucide-react';
import { ViewLayout, AppLanguage } from '../types.ts';
import { t } from '../i18n/translations.ts';

interface MobileBottomNavProps {
  onOpenProvidersModal: () => void;
  selectedProvidersCount: number;
  savedCount: number;
  onOpenSaved: () => void;
  viewLayout: ViewLayout;
  onCycleViewLayout: () => void;
  onScrollToTop: () => void;
  language: AppLanguage;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenProvidersModal,
  selectedProvidersCount,
  savedCount,
  onOpenSaved,
  viewLayout,
  onCycleViewLayout,
  onScrollToTop,
  language,
}) => {
  return (
    <nav
      id="mobile-bottom-nav"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-4 py-2 flex items-center justify-around"
    >
      {/* Home / Top Feed */}
      <button
        id="btn-mobile-nav-feed"
        type="button"
        onClick={onScrollToTop}
        className="flex flex-col items-center gap-1 text-stone-900 dark:text-stone-100 p-1"
      >
        <Newspaper className="w-5 h-5 text-amber-500" />
        <span className="text-[10px] font-bold">{t('news', language)}</span>
      </button>

      {/* Multiple Choice Sources */}
      <button
        id="btn-mobile-nav-providers"
        type="button"
        onClick={onOpenProvidersModal}
        className="flex flex-col items-center gap-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 p-1 relative"
      >
        <div className="relative">
          <SlidersHorizontal className="w-5 h-5" />
          <span className="absolute -top-1 -right-2 bg-amber-400 text-stone-950 text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
            {selectedProvidersCount}
          </span>
        </div>
        <span className="text-[10px] font-medium">{t('sources', language)}</span>
      </button>

      {/* Layout toggle on mobile */}
      <button
        id="btn-mobile-nav-layout"
        type="button"
        onClick={onCycleViewLayout}
        className="flex flex-col items-center gap-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 p-1"
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="text-[10px] font-medium uppercase">{viewLayout}</span>
      </button>

      {/* Bookmarks */}
      <button
        id="btn-mobile-nav-saved"
        type="button"
        onClick={onOpenSaved}
        className="flex flex-col items-center gap-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 p-1 relative"
      >
        <div className="relative">
          <Bookmark className="w-5 h-5" />
          {savedCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-amber-500 text-stone-950 text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {savedCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium">{t('saved', language)}</span>
      </button>
    </nav>
  );
};
