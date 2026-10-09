import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, UserPlus, Check, Phone } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  nativeName?: string;
  phone?: string;
  subText?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo';
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  isRequired?: boolean;
  isError?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  onQuickAdd?: () => void;
  quickAddLabel?: string;
  pageSize?: number;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '-- Select an option --',
  searchPlaceholder = 'Type to search...',
  emptyMessage = 'No options found',
  className = '',
  isRequired = false,
  isError = false,
  disabled = false,
  allowClear = true,
  clearLabel = 'None / Clear selection',
  onQuickAdd,
  quickAddLabel = '+ Quick Add',
  pageSize = 25,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Selected option details
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Filtered options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(term);
      const matchNative = opt.nativeName ? opt.nativeName.toLowerCase().includes(term) : false;
      const matchPhone = opt.phone ? opt.phone.toLowerCase().includes(term) : false;
      const matchSubText = opt.subText ? opt.subText.toLowerCase().includes(term) : false;
      return matchLabel || matchNative || matchPhone || matchSubText;
    });
  }, [options, searchTerm]);

  // Reset visibleCount when search term or open state changes
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [searchTerm, isOpen, pageSize]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Infinite scroll listener for options dropdown
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 30) {
      if (visibleCount < filteredOptions.length) {
        setVisibleCount((prev) => Math.min(prev + pageSize, filteredOptions.length));
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < filteredOptions.length - 1 ? prev + 1 : prev;
        if (next >= visibleCount - 2 && visibleCount < filteredOptions.length) {
          setVisibleCount((v) => Math.min(v + pageSize, filteredOptions.length));
        }
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {

    e.stopPropagation();
    onChange('');
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left px-3 py-1.5 rounded-xl border transition text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isError || (isRequired && !value)
            ? 'bg-amber-50/40 border-amber-400 text-slate-800 hover:border-amber-500'
            : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center space-x-1.5 truncate mr-1">
          {selectedOption ? (
            <div className="flex items-center space-x-1.5 truncate">
              <span className="truncate font-bold text-slate-900">{selectedOption.label}</span>
              {selectedOption.nativeName && (
                <span className="text-slate-500 text-[11px] font-normal truncate">
                  ({selectedOption.nativeName})
                </span>
              )}
              {selectedOption.phone && (
                <span className="text-slate-400 text-[11px] font-normal shrink-0">
                  • {selectedOption.phone}
                </span>
              )}
            </div>
          ) : (
            <span className={`${isRequired ? 'text-amber-700 font-semibold' : 'text-slate-500 font-normal'} truncate`}>
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0 ml-1">
          {allowClear && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180 text-indigo-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown with Search */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-84 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col">
          {/* Search Input Bar */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List with Scrolling Pagination */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="max-h-60 overflow-y-auto divide-y divide-slate-50 py-1"
          >
            {/* Clear / Default Option */}
            {allowClear && (
              <div
                onClick={() => handleSelect('')}
                className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition ${
                  value === '' ? 'bg-indigo-50/70 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  <span>{clearLabel}</span>
                </div>
                {value === '' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
            )}

            {/* List of matched items (paginated) */}
            {filteredOptions.length > 0 ? (
              filteredOptions.slice(0, visibleCount).map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = index === highlightedIndex;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-semibold'
                        : isHighlighted
                        ? 'bg-slate-50 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col truncate mr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-900 truncate">{opt.label}</span>
                        {opt.nativeName && (
                          <span className="text-slate-500 font-medium text-[11px] truncate">
                            ({opt.nativeName})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                        {opt.phone && (
                          <span className="flex items-center space-x-0.5">
                            <Phone className="w-2.5 h-2.5 inline mr-0.5 text-slate-400" />
                            {opt.phone}
                          </span>
                        )}
                        {opt.subText && <span>• {opt.subText}</span>}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {opt.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            opt.badgeColor === 'rose'
                              ? 'bg-rose-50 text-rose-600'
                              : opt.badgeColor === 'amber'
                              ? 'bg-amber-50 text-amber-700'
                              : opt.badgeColor === 'emerald'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-500 font-medium">{emptyMessage}</p>
                {onQuickAdd && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onQuickAdd();
                    }}
                    className="mt-2.5 inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{quickAddLabel}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer note / scrolling pagination count */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span className="font-medium">
              Showing {Math.min(visibleCount, filteredOptions.length)} of {filteredOptions.length}
              {filteredOptions.length > visibleCount && ' (scroll for more)'}
            </span>
            <span className="text-slate-400">Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
