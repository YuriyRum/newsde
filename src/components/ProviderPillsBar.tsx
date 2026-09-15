import React from 'react';
import { GERMAN_NEWS_PROVIDERS } from '../data/providers.ts';
import { SlidersHorizontal, Check } from 'lucide-react';

interface ProviderPillsBarProps {
  selectedProviders: string[];
  loadingProviders?: string[];
  onToggleProvider: (id: string) => void;
  onOpenModal: () => void;
}

export const ProviderPillsBar: React.FC<ProviderPillsBarProps> = ({
  selectedProviders,
  loadingProviders = [],
  onToggleProvider,
  onOpenModal,
}) => {
  return (
    <div
      id="provider-pills-container"
      className="flex items-center gap-2 overflow-x-auto py-2.5 px-4 sm:px-0 no-scrollbar"
    >
      <button
        id="btn-open-filter-modal-pill"
        onClick={onOpenModal}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 bg-stone-900 text-stone-100 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 transition-all shadow-xs cursor-pointer"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Quellen ({selectedProviders.length})</span>
      </button>

      <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 shrink-0 mx-1" />

      {GERMAN_NEWS_PROVIDERS.map((provider) => {
        const isSelected = selectedProviders.includes(provider.id);
        const isLoading = loadingProviders.includes(provider.id);

        return (
          <button
            key={provider.id}
            id={`pill-provider-${provider.id}`}
            onClick={() => onToggleProvider(provider.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors border cursor-pointer ${
              isSelected
                ? 'bg-amber-400 text-stone-900 border-amber-500 shadow-xs font-bold'
                : 'bg-white/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isSelected ? 'bg-stone-900' : 'bg-stone-400 dark:bg-stone-500'
              }`}
            />
            <span>{provider.shortName}</span>
            {isSelected && <Check className="w-3 h-3 text-stone-900 stroke-[3]" />}
          </button>
        );
      })}
    </div>
  );
};
