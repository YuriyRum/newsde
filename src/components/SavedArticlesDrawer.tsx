import React from 'react';
import { NewsItem } from '../types.ts';
import { formatGermanTimeAgo } from '../utils/date.ts';
import { X, BookmarkX, Trash2, BookOpen, ExternalLink, Bookmark } from 'lucide-react';

interface SavedArticlesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: NewsItem[];
  onRemoveSaved: (id: string) => void;
  onClearAll: () => void;
  onOpenReader: (item: NewsItem) => void;
}

export const SavedArticlesDrawer: React.FC<SavedArticlesDrawerProps> = ({
  isOpen,
  onClose,
  savedItems,
  onRemoveSaved,
  onClearAll,
  onOpenReader,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="saved-articles-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="saved-articles-drawer"
        className="w-full sm:max-w-md h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Bookmark className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Gespeicherte Artikel
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {savedItems.length} {savedItems.length === 1 ? 'Artikel' : 'Artikel'} in deiner Leseliste
              </p>
            </div>
          </div>
          <button
            id="btn-close-saved-drawer"
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedItems.length === 0 ? (
            <div className="py-16 text-center text-stone-400 space-y-3">
              <BookmarkX className="w-12 h-12 mx-auto stroke-1 text-stone-300 dark:text-stone-700" />
              <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
                Noch keine Artikel gespeichert
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 max-w-xs mx-auto">
                Tippe auf das Lesezeichen-Symbol bei beliebigen Nachrichten, um sie für später zu sichern.
              </p>
            </div>
          ) : (
            savedItems.map((item) => (
              <div
                key={item.id}
                id={`saved-item-${item.id}`}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 hover:bg-stone-100/80 dark:hover:bg-stone-800/80 transition-all flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs ${item.providerBadgeBg}`}
                    >
                      {item.providerName}
                    </span>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 ml-auto">
                      {formatGermanTimeAgo(item.pubDate || item.timestamp)}
                    </span>
                  </div>

                  <h4
                    onClick={() => {
                      onOpenReader(item);
                      onClose();
                    }}
                    className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer line-clamp-2"
                  >
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenReader(item);
                      onClose();
                    }}
                    className="font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Lesen</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                      title="Original öffnen"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onRemoveSaved(item.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 rounded"
                      title="Aus Liste entfernen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {savedItems.length > 0 && (
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between">
            <button
              id="btn-clear-all-saved"
              type="button"
              onClick={onClearAll}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Alle entfernen
            </button>
            <button
              id="btn-close-saved-bottom"
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
            >
              Fertig
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
