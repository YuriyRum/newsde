import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Tag, Layers, X, Sparkles } from 'lucide-react';

interface CategoryChipsBarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  breakingCount: number;
  totalCount: number;
  categoryCounts?: Record<string, number>;
}

export const CategoryChipsBar: React.FC<CategoryChipsBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  breakingCount,
  totalCount,
  categoryCounts = {},
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  // Mobile collapsible state - start collapsed on small screens by default to save space
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [wrapMode, setWrapMode] = useState(false);

  // Check scroll position for navigation buttons
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories, isMobileExpanded, wrapMode]);

  const scrollBy = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  const handleSelect = (cat: string) => {
    onSelectCategory(cat);
  };

  const activeCategoryLabel =
    selectedCategory === 'all'
      ? 'Alle Themen'
      : selectedCategory === 'breaking'
        ? 'Eilmeldungen'
        : selectedCategory;

  const activeCategoryCount =
    selectedCategory === 'all'
      ? totalCount
      : selectedCategory === 'breaking'
        ? breakingCount
        : categoryCounts[selectedCategory] || 0;

  return (
    <div
      id="category-chips-wrapper"
      className="w-full bg-stone-50/90 dark:bg-stone-900/60 border-y border-stone-200/80 dark:border-stone-800/80 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Mobile Collapsible Header Bar (Visible on mobile screens) */}
        <div className="flex sm:hidden items-center justify-between py-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            className="flex items-center gap-2 font-bold text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 rounded-md bg-amber-400/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Tag className="w-3 h-3" />
            </div>
            <span>Rubriken ({categories.length + 1})</span>
            {isMobileExpanded ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>

          {/* Active category indicator badge on mobile */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMobileExpanded(!isMobileExpanded)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/15 dark:bg-amber-400/20 text-stone-900 dark:text-amber-300 border border-amber-400/30"
            >
              <span>{activeCategoryLabel}</span>
              <span className="opacity-75">({activeCategoryCount})</span>
            </button>

            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                title="Filter zurücksetzen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Bar (Always visible on sm+ screens, collapsible on mobile) */}
        <div className={`${isMobileExpanded ? 'block' : 'hidden'} sm:block py-2 relative`}>
          <div className="flex items-center gap-1 relative">
            {/* Desktop Left Scroll Button */}
            {canScrollLeft && !wrapMode && (
              <button
                type="button"
                onClick={() => scrollBy(-200)}
                className="hidden sm:flex absolute left-0 z-10 w-7 h-7 rounded-full bg-white dark:bg-stone-800 shadow-md border border-stone-200 dark:border-stone-700 items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer"
                aria-label="Nach links scrollen"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Chips Scroll / Wrap Container */}
            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              id="category-chips-container"
              className={`w-full flex gap-1.5 text-xs font-semibold ${
                wrapMode
                  ? 'flex-wrap py-1'
                  : 'overflow-x-auto smooth-horizontal-scroll py-1 px-1 no-scrollbar touch-pan-x'
              }`}
            >
              {/* All categories chip */}
              <button
                id="chip-category-all"
                type="button"
                onClick={() => handleSelect('all')}
                className={`px-3 py-1.5 rounded-full transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none ${
                  selectedCategory === 'all'
                    ? 'bg-stone-900 text-white dark:bg-amber-400 dark:text-stone-950 shadow-xs font-bold ring-2 ring-stone-900/20 dark:ring-amber-400/40'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/80 border border-stone-200/80 dark:border-stone-700/60'
                }`}
              >
                <span>Alle Themen</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === 'all'
                      ? 'bg-white/20 dark:bg-black/20 text-white dark:text-stone-950 font-bold'
                      : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                  }`}
                >
                  {totalCount}
                </span>
              </button>

              {/* Breaking news chip */}
              {breakingCount > 0 && (
                <button
                  id="chip-category-breaking"
                  type="button"
                  onClick={() => handleSelect('breaking')}
                  className={`px-3 py-1.5 rounded-full transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none ${
                    selectedCategory === 'breaking'
                      ? 'bg-red-600 text-white shadow-xs font-bold ring-2 ring-red-500/30'
                      : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/40'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>Eilmeldungen</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedCategory === 'breaking'
                        ? 'bg-white/20 text-white'
                        : 'bg-red-200/80 dark:bg-red-900/80 text-red-800 dark:text-red-200'
                    }`}
                  >
                    {breakingCount}
                  </span>
                </button>
              )}

              {/* Category tags */}
              {categories.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                const count = categoryCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    id={`chip-category-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    type="button"
                    onClick={() => handleSelect(isSelected ? 'all' : cat)}
                    className={`px-3 py-1.5 rounded-full transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-stone-900 text-white dark:bg-amber-400 dark:text-stone-950 shadow-xs font-bold ring-2 ring-stone-900/20 dark:ring-amber-400/40'
                        : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/80 border border-stone-200/80 dark:border-stone-700/60'
                    }`}
                  >
                    <span>{cat}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-white/20 dark:bg-black/20 text-white dark:text-stone-950 font-bold'
                            : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Desktop Right Scroll Button */}
            {canScrollRight && !wrapMode && (
              <button
                type="button"
                onClick={() => scrollBy(200)}
                className="hidden sm:flex absolute right-0 z-10 w-7 h-7 rounded-full bg-white dark:bg-stone-800 shadow-md border border-stone-200 dark:border-stone-700 items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer"
                aria-label="Nach rechts scrollen"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Grid wrap mode toggle button on larger screens */}
            <div className="hidden lg:flex items-center ml-2 pl-2 border-l border-stone-200 dark:border-stone-800 shrink-0">
              <button
                type="button"
                onClick={() => setWrapMode(!wrapMode)}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  wrapMode
                    ? 'bg-amber-400 text-stone-950 font-bold'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
                title={wrapMode ? 'Horizontal scrollen' : 'Alle Rubriken aufklappen'}
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
