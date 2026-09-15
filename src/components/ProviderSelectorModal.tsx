import React, { useState } from 'react';
import { GERMAN_NEWS_PROVIDERS } from '../data/providers.ts';
import { AppLanguage } from '../types.ts';
import { t } from '../i18n/translations.ts';
import { Check, X, SlidersHorizontal, ExternalLink, ShieldCheck, CheckCheck } from 'lucide-react';

interface ProviderSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProviders: string[];
  onChange: (newSelected: string[]) => void;
  language: AppLanguage;
}

export const ProviderSelectorModal: React.FC<ProviderSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedProviders,
  onChange,
  language,
}) => {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedProviders);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Keep in sync when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedProviders);
    }
  }, [isOpen, selectedProviders]);

  if (!isOpen) return null;

  const toggleProvider = (id: string) => {
    if (tempSelected.includes(id)) {
      // Don't allow deselecting all
      if (tempSelected.length > 1) {
        setTempSelected(tempSelected.filter((p) => p !== id));
      }
    } else {
      setTempSelected([...tempSelected, id]);
    }
  };

  const selectAll = () => {
    setTempSelected(GERMAN_NEWS_PROVIDERS.map((p) => p.id));
  };

  const selectPublicOnly = () => {
    const publicIds = GERMAN_NEWS_PROVIDERS.filter(
      (p) => p.category === 'public' || p.category === 'international'
    ).map((p) => p.id);
    setTempSelected(publicIds);
  };

  const selectPressOnly = () => {
    const pressIds = GERMAN_NEWS_PROVIDERS.filter((p) => p.category === 'press').map((p) => p.id);
    setTempSelected(pressIds);
  };

  const selectTagesschauAndDW = () => {
    setTempSelected(['tagesschau', 'dw']);
  };

  const handleApply = () => {
    onChange(tempSelected);
    onClose();
  };

  const filteredProviders = GERMAN_NEWS_PROVIDERS.filter((p) => {
    if (filterCategory === 'all') return true;
    return p.category === filterCategory;
  });

  return (
    <div
      id="provider-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 transition-opacity animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="provider-modal-content"
        className="w-full sm:max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
                {t('selectNewsSources', language)}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                  {tempSelected.length}/{GERMAN_NEWS_PROVIDERS.length}
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {t('selectNewsSourcesSubtitle', language)}
              </p>
            </div>
          </div>
          <button
            id="btn-close-provider-modal"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label={t('close', language)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="px-4 py-3 bg-stone-100/60 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800 flex flex-wrap gap-2 items-center text-xs">
          <span className="font-semibold text-stone-600 dark:text-stone-300 mr-1 flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" /> {t('quickSelect', language)}:
          </span>
          <button
            id="btn-preset-all"
            type="button"
            onClick={selectAll}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-medium text-stone-700 dark:text-stone-200 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            {t('selectAll', language)}
          </button>
          <button
            id="btn-preset-tagesschau-dw"
            type="button"
            onClick={selectTagesschauAndDW}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-medium text-stone-700 dark:text-stone-200 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            Tagesschau & DW
          </button>
          <button
            id="btn-preset-public"
            type="button"
            onClick={selectPublicOnly}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-medium text-stone-700 dark:text-stone-200 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            {t('publicBroadcasters', language)}
          </button>
          <button
            id="btn-preset-press"
            type="button"
            onClick={selectPressOnly}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-medium text-stone-700 dark:text-stone-200 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            {t('qualityPress', language)}
          </button>
        </div>

        {/* Category Filters Tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 px-4 pt-2 gap-2 text-xs font-medium overflow-x-auto">
          <button
            id="tab-all-providers"
            onClick={() => setFilterCategory('all')}
            className={`pb-2 px-2 border-b-2 transition-colors whitespace-nowrap ${
              filterCategory === 'all'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            {t('allSources', language)} ({GERMAN_NEWS_PROVIDERS.length})
          </button>
          <button
            id="tab-public-providers"
            onClick={() => setFilterCategory('public')}
            className={`pb-2 px-2 border-b-2 transition-colors whitespace-nowrap ${
              filterCategory === 'public'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            {t('publicBroadcasters', language)}
          </button>
          <button
            id="tab-press-providers"
            onClick={() => setFilterCategory('press')}
            className={`pb-2 px-2 border-b-2 transition-colors whitespace-nowrap ${
              filterCategory === 'press'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            {t('qualityPress', language)}
          </button>
          <button
            id="tab-tech-providers"
            onClick={() => setFilterCategory('tech')}
            className={`pb-2 px-2 border-b-2 transition-colors whitespace-nowrap ${
              filterCategory === 'tech'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            {t('techAndDigital', language)}
          </button>
        </div>

        {/* Provider List (Multiple Choice) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredProviders.map((provider) => {
            const isSelected = tempSelected.includes(provider.id);
            return (
              <div
                key={provider.id}
                id={`provider-item-${provider.id}`}
                onClick={() => toggleProvider(provider.id)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-400/80 dark:border-amber-500/40 shadow-xs'
                    : 'bg-stone-50/50 dark:bg-stone-800/30 border-stone-200 dark:border-stone-800 hover:bg-stone-100/50 dark:hover:bg-stone-800/60 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Custom Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-white font-bold'
                        : 'border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  {/* Provider Logo Avatar */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black tracking-tight shrink-0 shadow-xs ${provider.badgeBg}`}
                  >
                    {provider.logoText}
                  </div>

                  {/* Provider Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {provider.name}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                        {provider.categoryLabel}
                      </span>
                      {provider.id === 'tagesschau' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                          ARD Primärquelle
                        </span>
                      )}
                      {provider.id === 'dw' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                          Ausland
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                      {provider.description}
                    </p>
                  </div>
                </div>

                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-700/60 transition-colors ml-2"
                  title={`Webseite von ${provider.name} öffnen`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90 flex items-center justify-between gap-3">
          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t('directFetchGuarantee', language)}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="btn-cancel-provider-modal"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            >
              {t('cancel', language)}
            </button>
            <button
              id="btn-apply-provider-modal"
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 shadow-sm transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {tempSelected.length} {t('applySources', language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
