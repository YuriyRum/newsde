import React, { useState, useEffect } from 'react';
import { NewsItem, ViewLayout, FontSize, AppLanguage } from '../types.ts';
import { formatTimeAgo } from '../utils/date.ts';
import { t, getLocalizedCategoryName } from '../i18n/translations.ts';
import { translateTextToRussian, getCachedTranslation } from '../services/translationService.ts';
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Share2,
  BookOpen,
  Zap,
  Check,
  Languages,
  Loader2,
} from 'lucide-react';

interface NewsTileProps {
  item: NewsItem;
  layout: ViewLayout;
  fontSize: FontSize;
  isBookmarked: boolean;
  onToggleBookmark: (item: NewsItem) => void;
  onOpenReader: (item: NewsItem) => void;
  onSelectCategory?: (category: string) => void;
  language: AppLanguage;
}

const NewsTileComponent: React.FC<NewsTileProps> = ({
  item,
  layout,
  fontSize,
  isBookmarked,
  onToggleBookmark,
  onOpenReader,
  onSelectCategory,
  language,
}) => {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Individual card translation state
  const [isTranslated, setIsTranslated] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedTitle, setTranslatedTitle] = useState<string>('');
  const [translatedSummary, setTranslatedSummary] = useState<string>('');

  // Check if cache already has translations
  useEffect(() => {
    const cachedT = getCachedTranslation(item.title);
    const cachedS = item.summary ? getCachedTranslation(item.summary) : '';
    if (cachedT) {
      setTranslatedTitle(cachedT);
      if (cachedS) setTranslatedSummary(cachedS);
    }
  }, [item.title, item.summary]);

  const handleToggleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }

    if (translatedTitle && (!item.summary || translatedSummary)) {
      setIsTranslated(true);
      return;
    }

    setIsTranslating(true);
    try {
      const [tTitle, tSum] = await Promise.all([
        translateTextToRussian(item.title),
        item.summary ? translateTextToRussian(item.summary) : Promise.resolve(''),
      ]);
      setTranslatedTitle(tTitle);
      setTranslatedSummary(tSum);
      setIsTranslated(true);
    } catch {
      // ignore
    } finally {
      setIsTranslating(false);
    }
  };

  const currentTitle = isTranslated && translatedTitle ? translatedTitle : item.title;
  const currentSummary = isTranslated && translatedSummary ? translatedSummary : item.summary;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTitle,
          text: currentSummary,
          url: item.link,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(item.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const titleFontSizeClass = {
    sm: 'text-base sm:text-base leading-snug',
    base: 'text-lg sm:text-lg leading-snug',
    lg: 'text-xl sm:text-xl leading-snug',
    xl: 'text-2xl sm:text-2xl leading-snug',
  }[fontSize];

  const summaryFontSizeClass = {
    sm: 'text-xs leading-relaxed',
    base: 'text-sm leading-relaxed',
    lg: 'text-base leading-relaxed',
    xl: 'text-lg leading-relaxed',
  }[fontSize];

  const localizedCategory = item.category ? getLocalizedCategoryName(item.category, language) : '';

  // Compact Layout (Horizontal list card)
  if (layout === 'compact') {
    return (
      <article
        id={`news-tile-compact-${item.id}`}
        onClick={() => onOpenReader(item)}
        className="group relative bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500/50 rounded-2xl p-3.5 sm:p-4 transition-all hover:shadow-md cursor-pointer flex flex-col sm:flex-row gap-3 sm:gap-4 overflow-hidden"
      >
        {/* Thumbnail if available */}
        {item.imageUrl && !imageError ? (
          <div className="w-full sm:w-36 h-36 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 relative">
            <img
              src={item.imageUrl}
              alt={currentTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
            />
            {item.isBreaking && (
              <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Zap className="w-2.5 h-2.5 fill-current" /> {t('breakingNews', language)}
              </div>
            )}
          </div>
        ) : null}

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md shadow-2xs ${item.providerBadgeBg}`}
              >
                {item.providerName}
              </span>
              {localizedCategory && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectCategory) onSelectCategory(item.category!);
                  }}
                  className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 hover:underline bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  title={`${t('categories', language)}: ${localizedCategory}`}
                >
                  {localizedCategory}
                </button>
              )}
              {isTranslated && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/60">
                  {t('translatedTag', language)}
                </span>
              )}
              <span className="text-[11px] text-stone-400 dark:text-stone-500 ml-auto">
                {formatTimeAgo(item.pubDate || item.timestamp, language)}
              </span>
            </div>

            <h3
              className={`font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors ${titleFontSizeClass}`}
            >
              {currentTitle}
            </h3>

            {currentSummary && (
              <p
                className={`text-stone-600 dark:text-stone-400 mt-1 line-clamp-2 font-sans ${summaryFontSizeClass}`}
              >
                {currentSummary}
              </p>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 text-xs">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReader(item);
              }}
              className="font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 flex items-center gap-1.5 py-1 px-2 -ml-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('readMore', language)}</span>
            </button>

            <div className="flex items-center gap-1">
              {/* Translate button */}
              <button
                type="button"
                onClick={handleToggleTranslate}
                disabled={isTranslating}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                  isTranslated
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
                title={isTranslated ? t('showOriginal', language) : t('translateToRussian', language)}
              >
                {isTranslating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                ) : (
                  <Languages className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px]">{isTranslated ? 'DE' : 'RU'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title={t('copyLink', language)}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(item);
                }}
                className={`p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                  isBookmarked
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
                title={isBookmarked ? t('saved', language) : t('saveArticle', language)}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 fill-current" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>

              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title={t('visitOriginal', language)}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Headline Dense Layout
  if (layout === 'headline') {
    return (
      <article
        id={`news-tile-headline-${item.id}`}
        onClick={() => onOpenReader(item)}
        className="group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500/50 rounded-xl p-3 sm:p-3.5 transition-all hover:shadow-xs cursor-pointer flex items-center justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.providerBadgeBg}`}
            >
              {item.providerName}
            </span>
            {item.isBreaking && (
              <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5 fill-current" /> {t('breakingNews', language)}
              </span>
            )}
            {isTranslated && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                RU
              </span>
            )}
            <span className="text-[11px] text-stone-400 dark:text-stone-500">
              {formatTimeAgo(item.pubDate || item.timestamp, language)}
            </span>
          </div>

          <h3
            className={`font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors line-clamp-2 ${titleFontSizeClass}`}
          >
            {currentTitle}
          </h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleToggleTranslate}
            disabled={isTranslating}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
              isTranslated
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title={isTranslated ? t('showOriginal', language) : t('translateToRussian', language)}
          >
            {isTranslating ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            ) : (
              <Languages className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(item);
            }}
            className={`p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
              isBookmarked
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-4 h-4 fill-current" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </article>
    );
  }

  // Primary Standard Magazine Tile Layout (Grid)
  return (
    <article
      id={`news-tile-card-${item.id}`}
      onClick={() => onOpenReader(item)}
      className="group relative bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 hover:border-amber-400/90 dark:hover:border-amber-500/40 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      {/* Tile Image Header */}
      {item.imageUrl && !imageError ? (
        <div className="relative w-full aspect-16/9 overflow-hidden bg-stone-100 dark:bg-stone-800">
          <img
            src={item.imageUrl}
            alt={currentTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />

          {/* Provider Badge on Image */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md backdrop-blur-xs ${item.providerBadgeBg}`}
            >
              {item.providerName}
            </span>
            {item.isBreaking && (
              <span className="bg-red-600 text-white text-[11px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md animate-pulse">
                <Zap className="w-3 h-3 fill-current" /> {t('breakingNews', language)}
              </span>
            )}
          </div>

          {/* Category Tag on Image */}
          {localizedCategory && (
            <div className="absolute bottom-2.5 left-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectCategory) onSelectCategory(item.category!);
                }}
                className="text-[11px] font-semibold text-white/95 bg-black/50 hover:bg-amber-600 px-2.5 py-0.5 rounded backdrop-blur-xs transition-colors cursor-pointer"
                title={`${t('categories', language)}: ${localizedCategory}`}
              >
                {localizedCategory}
              </button>
            </div>
          )}

          {/* Time Badge on Image */}
          <div className="absolute bottom-2.5 right-3 text-[11px] text-white/90 font-medium bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
            {formatTimeAgo(item.pubDate || item.timestamp, language)}
          </div>
        </div>
      ) : (
        /* Image fallback banner */
        <div className="p-4 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs ${item.providerBadgeBg}`}
            >
              {item.providerName}
            </span>
            {localizedCategory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectCategory) onSelectCategory(item.category!);
                }}
                className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 hover:underline bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded cursor-pointer transition-colors"
                title={`${t('categories', language)}: ${localizedCategory}`}
              >
                {localizedCategory}
              </button>
            )}
            {item.isBreaking && (
              <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                <Zap className="w-2.5 h-2.5 fill-current" /> {t('breakingNews', language)}
              </span>
            )}
          </div>
          <span className="text-xs text-stone-400 dark:text-stone-500">
            {formatTimeAgo(item.pubDate || item.timestamp, language)}
          </span>
        </div>
      )}

      {/* Body Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors ${titleFontSizeClass}`}
            >
              {currentTitle}
            </h3>
          </div>

          {currentSummary && (
            <p
              className={`text-stone-600 dark:text-stone-300 mt-2.5 line-clamp-3 font-sans ${summaryFontSizeClass}`}
            >
              {currentSummary}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenReader(item);
            }}
            className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 flex items-center gap-1.5 py-1 px-2.5 -ml-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t('readMore', language)}</span>
          </button>

          <div className="flex items-center gap-1">
            {/* Translate to Russian toggle button on tile */}
            <button
              type="button"
              onClick={handleToggleTranslate}
              disabled={isTranslating}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                isTranslated
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              title={isTranslated ? t('showOriginal', language) : t('translateToRussian', language)}
            >
              {isTranslating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <Languages className="w-3.5 h-3.5" />
              )}
              <span className="text-[11px]">{isTranslated ? 'DE' : 'RU'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title={t('copyLink', language)}
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(item);
              }}
              className={`p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                isBookmarked
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
              }`}
              title={isBookmarked ? t('saved', language) : t('saveArticle', language)}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 fill-current" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title={t('visitOriginal', language)}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};

export const NewsTile = React.memo(NewsTileComponent);
