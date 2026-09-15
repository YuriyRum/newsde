import React, { useState, useEffect } from 'react';
import { NewsItem, FontSize, AppLanguage } from '../types.ts';
import { formatTimeAgo } from '../utils/date.ts';
import { t, getLocalizedCategoryName } from '../i18n/translations.ts';
import { translateTextToRussian, translateParagraphsToRussian } from '../services/translationService.ts';
import {
  X,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Share2,
  Check,
  ShieldCheck,
  Type,
  Loader2,
  Languages,
} from 'lucide-react';

interface ArticleReaderModalProps {
  item: NewsItem | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (item: NewsItem) => void;
  onSelectCategory?: (category: string) => void;
  language: AppLanguage;
}

interface ArticleExtractedContent {
  title?: string;
  paragraphs: string[];
  leadImage?: string;
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({
  item,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onSelectCategory,
  language,
}) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<ArticleExtractedContent | null>(null);
  const [useSerif, setUseSerif] = useState(true);
  const [readerFontSize, setReaderFontSize] = useState<FontSize>('base');
  const [copied, setCopied] = useState(false);

  // Translation state for the reader
  const [isRussianTranslated, setIsRussianTranslated] = useState(false);
  const [translatingContent, setTranslatingContent] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<ArticleExtractedContent | null>(null);

  useEffect(() => {
    if (!item) {
      setContent(null);
      setTranslatedContent(null);
      setIsRussianTranslated(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setIsRussianTranslated(false);
    setTranslatedContent(null);

    const isBackend =
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('netlify.app') &&
      !window.location.hostname.includes('github.io') &&
      !window.location.hostname.includes('vercel.app') &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('.run.app'));

    const handleFallback = async () => {
      if (!isMounted) return;
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(item.link)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data.contents) {
            const doc = new DOMParser().parseFromString(data.contents, 'text/html');
            doc
              .querySelectorAll('script, style, nav, header, footer, noscript, iframe, .ad, .cookie-banner')
              .forEach((el) => el.remove());
            const articleEl = doc.querySelector('article') || doc.querySelector('main') || doc.body;
            const pEls = articleEl.querySelectorAll('p');
            const paragraphs: string[] = [];
            pEls.forEach((p) => {
              const text = (p.textContent || '').trim();
              if (
                text.length > 40 &&
                !text.includes('Datenschutz') &&
                !text.includes('Abonnieren') &&
                !text.includes('Newsletter')
              ) {
                paragraphs.push(text);
              }
            });
            if (paragraphs.length > 0) {
              if (isMounted) {
                setContent({
                  title: item.title,
                  paragraphs,
                  leadImage: doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || item.imageUrl,
                });
                return;
              }
            }
          }
        }
      } catch {
        // Fallback to item summary
      }

      if (isMounted) {
        setContent({
          title: item.title,
          paragraphs: item.summary ? [item.summary] : [],
          leadImage: item.imageUrl,
        });
      }
    };

    if (isBackend) {
      fetch(`/api/article-reader?url=${encodeURIComponent(item.link)}`, { signal: AbortSignal.timeout(3000) })
        .then((res) => {
          if (!res.ok) throw new Error('Local reader API unavailable');
          return res.json();
        })
        .then((data) => {
          if (!isMounted) return;
          if (data.success && data.paragraphs && data.paragraphs.length > 0) {
            setContent({
              title: data.title || item.title,
              paragraphs: data.paragraphs,
              leadImage: data.leadImage || item.imageUrl,
            });
          } else {
            handleFallback();
          }
        })
        .catch(() => {
          handleFallback();
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      handleFallback().finally(() => {
        if (isMounted) setLoading(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [item]);

  const handleToggleRussian = async () => {
    if (isRussianTranslated) {
      setIsRussianTranslated(false);
      return;
    }

    if (translatedContent) {
      setIsRussianTranslated(true);
      return;
    }

    if (!content && !item) return;

    setTranslatingContent(true);
    try {
      const origTitle = content?.title || item?.title || '';
      const origParagraphs = content?.paragraphs && content.paragraphs.length > 0 ? content.paragraphs : (item?.summary ? [item.summary] : []);

      const [ruTitle, ruParagraphs] = await Promise.all([
        translateTextToRussian(origTitle),
        translateParagraphsToRussian(origParagraphs),
      ]);

      setTranslatedContent({
        title: ruTitle,
        paragraphs: ruParagraphs,
        leadImage: content?.leadImage || item?.imageUrl,
      });
      setIsRussianTranslated(true);
    } catch {
      // ignore
    } finally {
      setTranslatingContent(false);
    }
  };

  // Keyboard shortcut ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const displayContent = isRussianTranslated && translatedContent ? translatedContent : content;
  const displayTitle = displayContent?.title || item.title;
  const localizedCategory = item.category ? getLocalizedCategoryName(item.category, language) : '';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: displayTitle,
          text: item.summary,
          url: item.link,
        });
        return;
      } catch {
        // Fallback
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

  const fontClass = useSerif ? 'font-serif' : 'font-sans';
  const paragraphSizeClass = {
    sm: 'text-sm leading-relaxed mb-4',
    base: 'text-base leading-relaxed sm:text-lg mb-5',
    lg: 'text-lg leading-relaxed sm:text-xl mb-6',
    xl: 'text-xl leading-relaxed sm:text-2xl mb-7',
  }[readerFontSize];

  return (
    <div
      id="article-reader-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="article-reader-container"
        className="w-full sm:max-w-3xl min-h-screen sm:min-h-0 sm:max-h-[92vh] bg-white dark:bg-stone-900 sm:rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden my-auto"
      >
        {/* Sticky Reader Toolbar */}
        <div className="sticky top-0 z-20 px-4 py-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
          {/* Source badge */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md shrink-0 ${item.providerBadgeBg}`}
            >
              {item.providerName}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 hidden sm:inline truncate">
              {formatTimeAgo(item.pubDate || item.timestamp, language)}
            </span>
          </div>

          {/* Reader customization options */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Translate to Russian toggle */}
            <button
              type="button"
              onClick={handleToggleRussian}
              disabled={translatingContent}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${
                isRussianTranslated
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                  : 'bg-stone-50 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
              }`}
              title={isRussianTranslated ? t('showOriginal', language) : t('translateToRussian', language)}
            >
              {translatingContent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <Languages className="w-3.5 h-3.5" />
              )}
              <span>{isRussianTranslated ? t('showOriginal', language) : t('translateToRussian', language)}</span>
            </button>

            {/* Serif / Sans toggle */}
            <button
              type="button"
              onClick={() => setUseSerif(!useSerif)}
              className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 ${
                useSerif
                  ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-700'
                  : 'bg-transparent text-stone-500 border-transparent hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              title={t('switchFont', language)}
            >
              <Type className="w-3.5 h-3.5" />
              <span>{useSerif ? 'Serif' : 'Sans'}</span>
            </button>

            {/* Font size control */}
            <div className="flex items-center rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  if (readerFontSize === 'xl') setReaderFontSize('lg');
                  else if (readerFontSize === 'lg') setReaderFontSize('base');
                  else if (readerFontSize === 'base') setReaderFontSize('sm');
                }}
                className="px-2 py-0.5 rounded hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"
                title={t('smallerText', language)}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => {
                  if (readerFontSize === 'sm') setReaderFontSize('base');
                  else if (readerFontSize === 'base') setReaderFontSize('lg');
                  else if (readerFontSize === 'lg') setReaderFontSize('xl');
                }}
                className="px-2 py-0.5 rounded hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"
                title={t('largerText', language)}
              >
                A+
              </button>
            </div>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title={t('shareArticle', language)}
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>

            {/* Bookmark */}
            <button
              type="button"
              onClick={() => onToggleBookmark(item)}
              className={`p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                isBookmarked
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
              title={isBookmarked ? t('saved', language) : t('saveArticle', language)}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 fill-current" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            <div className="h-4 w-px bg-stone-200 dark:bg-stone-800 mx-0.5" />

            {/* Close Button */}
            <button
              id="btn-close-reader-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label={t('close', language)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-10 sm:py-8">
          {/* Ad-free guarantee banner */}
          <div className="mb-6 flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold">{t('adFreeActive', language)}</span>
            </div>
            <span className="text-[11px] opacity-80">{t('noTrackers', language)}</span>
          </div>

          {/* Article Header */}
          <div className="mb-6">
            {localizedCategory && (
              <button
                type="button"
                onClick={() => {
                  if (onSelectCategory) {
                    onSelectCategory(item.category!);
                    onClose();
                  }
                }}
                className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 hover:underline mb-2 inline-block cursor-pointer"
                title={`${t('categories', language)}: ${localizedCategory}`}
              >
                {localizedCategory}
              </button>
            )}
            <h1
              className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-tight ${fontClass}`}
            >
              {displayTitle}
            </h1>

            <div className="mt-3 flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                {t('source', language)}: {item.providerName}
              </span>
              <span>•</span>
              <span>{formatTimeAgo(item.pubDate || item.timestamp, language)}</span>
              {isRussianTranslated && (
                <>
                  <span>•</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    {t('translatedTag', language)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Lead Image if available */}
          {(displayContent?.leadImage || item.imageUrl) && (
            <div className="mb-8 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 shadow-sm border border-stone-200 dark:border-stone-800">
              <img
                src={displayContent?.leadImage || item.imageUrl}
                alt={displayTitle}
                className="w-full max-h-96 object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs font-medium">{t('loadingArticle', language)}</p>
            </div>
          )}

          {/* Extracted Paragraphs */}
          {!loading && displayContent && displayContent.paragraphs.length > 0 && (
            <div className={`text-stone-800 dark:text-stone-200 ${fontClass}`}>
              {displayContent.paragraphs.map((p, idx) => (
                <p key={idx} className={paragraphSizeClass}>
                  {p}
                </p>
              ))}
            </div>
          )}

          {!loading && (!displayContent || displayContent.paragraphs.length === 0) && (
            <div className="p-6 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 text-center my-6">
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
                {item.summary || t('clickBelowForOriginal', language)}
              </p>
            </div>
          )}

          {/* Original Source Callout */}
          <div className="mt-10 p-4 sm:p-5 rounded-2xl bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {t('visitOriginalSource', language)}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {t('fullReportAt', language)} {item.providerName}
              </p>
            </div>
            <a
              id="btn-visit-original-article"
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 transition-all inline-flex items-center gap-2 shrink-0 shadow-xs"
            >
              <span>{item.providerName} {t('open', language)}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
