import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, X, Sparkles, Pill, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../../lib/apiFetch';
import type { MedicineSearchResultItem, MedicineSearchResponse } from '../../lib/types';

interface MedicineAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (item: MedicineSearchResultItem) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  pill?: boolean;
  actionButton?: React.ReactNode;
  onSubmit?: () => void;
}

export const MedicineAutocompleteInput: React.FC<MedicineAutocompleteInputProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Type medicine or brand name (e.g. Dolo 650, Amoxicillin)...',
  disabled = false,
  autoFocus = false,
  className,
  inputClassName,
  dropdownClassName,
  pill = false,
  actionButton,
  onSubmit,
}) => {
  const [results, setResults] = useState<MedicineSearchResultItem[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Debounced live search
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setDidYouMean(null);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch(`/medicines/search?q=${encodeURIComponent(trimmed)}&limit=8`);
      if (res.ok) {
        const data: MedicineSearchResponse = await res.json();
        setResults(data.matches || []);
        setDidYouMean(data.did_you_mean || null);
        setIsOpen((data.matches && data.matches.length > 0) || Boolean(data.did_you_mean));
        setHighlightedIndex(-1);
      } else {
        setResults([]);
        setDidYouMean(null);
      }
    } catch (err) {
      console.warn('Medicine search request failed:', err);
      setResults([]);
      setDidYouMean(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Watch for input changes with 250ms debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value || value.trim().length < 2) {
      setResults([]);
      setDidYouMean(null);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, performSearch]);

  // Dismiss dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        e.preventDefault();
        handleItemClick(results[highlightedIndex]);
      } else if (onSubmit) {
        e.preventDefault();
        setIsOpen(false);
        onSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleItemClick = (item: MedicineSearchResultItem) => {
    onChange(item.name);
    onSelect(item);
    setIsOpen(false);
    setResults([]);
    setDidYouMean(null);
  };

  const handleApplyDidYouMean = (correction: string) => {
    onChange(correction);
    performSearch(correction);
  };

  const handleClear = () => {
    onChange('');
    setResults([]);
    setDidYouMean(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={clsx('relative w-full text-left', className)}>
      {/* Search Input Row (Input + Optional Action Button) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0 flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />

          <input
            ref={inputRef}
            type="text"
            value={value}
            disabled={disabled}
            autoFocus={autoFocus}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (results.length > 0 || didYouMean) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            className={clsx(
              'w-full text-slate-800 text-xs sm:text-[13px] font-semibold placeholder:text-slate-400 pl-10 pr-10 py-3 transition-all',
              pill
                ? 'rounded-full bg-[#F1F5F9]/80 border border-slate-200/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] focus:bg-white focus:ring-2 focus:ring-blue-500/30'
                : 'rounded-2xl bg-[#F8FAFC] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white shadow-2xs',
              inputClassName
            )}
          />

          {/* Loading Spinner or Clear Button */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isLoading && (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            )}

            {value && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="w-5 h-5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Clear input"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Optional Action Button (aligned within the same relative container) */}
        {actionButton && (
          <div className="shrink-0 flex items-center">
            {actionButton}
          </div>
        )}
      </div>

      {/* FLOATING DROPDOWN MENU */}
      {isOpen && (
        <div
          className={clsx(
            'absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 overflow-hidden text-left max-h-64 sm:max-h-80 overflow-y-auto',
            dropdownClassName
          )}
        >
          {/* Typo Correction Banner ("Did you mean: X?") */}
          {didYouMean && didYouMean.toLowerCase() !== value.trim().toLowerCase() && (
            <div className="px-3.5 py-2 mb-1 bg-amber-50/90 border-b border-amber-200/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11.5px] text-amber-900 font-medium truncate">
                  Did you mean:{' '}
                  <button
                    type="button"
                    onClick={() => handleApplyDidYouMean(didYouMean)}
                    className="font-bold underline hover:text-amber-950 cursor-pointer"
                  >
                    {didYouMean}
                  </button>
                  ?
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleApplyDidYouMean(didYouMean)}
                className="text-[10.5px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/70 hover:bg-amber-300 px-2 py-0.5 rounded-md transition-colors shrink-0 cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}

          {/* Autocomplete Suggestions List */}
          {results.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {results.map((item, index) => {
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={item.id || `med-${index}`}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleItemClick(item)}
                    className={clsx(
                      'w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer',
                      isHighlighted ? 'bg-blue-50/80 text-blue-950' : 'hover:bg-slate-50 text-slate-800'
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      {/* Name & Match Type Badge */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="text-xs sm:text-[13px] font-bold text-slate-900 truncate"
                          title={item.name}
                        >
                          {item.name}
                        </span>

                        {/* Match Type Badge */}
                        <span
                          className={clsx(
                            'text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0',
                            item.match_type === 'exact'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.match_type === 'prefix'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {item.match_type === 'exact'
                            ? 'Exact'
                            : item.match_type === 'prefix'
                            ? 'Prefix'
                            : 'Fuzzy'}
                        </span>
                      </div>

                      {/* Generic Name / Active Ingredient */}
                      <p className="text-[11px] font-medium text-slate-500 truncate">
                        Active: <span className="text-slate-700 font-semibold">{item.generic_name}</span>
                        {item.category && item.category !== 'General' && (
                          <span> • {item.category}</span>
                        )}
                      </p>
                    </div>

                    {/* Dosage form / Strength pill */}
                    {(item.dosage_form || (item.strengths && item.strengths.length > 0)) && (
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[10.5px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full max-w-[130px] sm:max-w-[170px]">
                          <Pill className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {item.dosage_form || 'Tablet'}
                            {item.strengths && item.strengths.length > 0 && ` • ${item.strengths[0]}`}
                          </span>
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            !didYouMean && (
              <div className="px-4 py-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>No matching medications found in catalog</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
