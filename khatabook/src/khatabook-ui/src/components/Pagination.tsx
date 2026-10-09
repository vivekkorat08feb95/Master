import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  variant?: 'light' | 'dark';
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  variant = 'light',
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalItems);

  // Calculate page window
  const getPageNumbers = () => {
    const delta = 1;
    const range: (number | string)[] = [];
    for (
      let i = Math.max(2, safeCurrentPage - delta);
      i <= Math.min(totalPages - 1, safeCurrentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (safeCurrentPage - delta > 2) {
      range.unshift('...');
    }
    if (safeCurrentPage + delta < totalPages - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  const isDark = variant === 'dark';

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t text-xs select-none ${
        isDark
          ? 'bg-slate-850 border-slate-700 text-slate-300'
          : 'bg-slate-50/80 border-slate-200 text-slate-600'
      } ${className}`}
    >
      {/* Left: Summary and Page Size Selector */}
      <div className="flex items-center space-x-3">
        <span>
          Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{startRecord}</strong> to{' '}
          <strong className={isDark ? 'text-white' : 'text-slate-900'}>{endRecord}</strong> of{' '}
          <strong className={isDark ? 'text-white' : 'text-slate-900'}>{totalItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center space-x-1.5 ml-2">
            <span className="text-[11px] text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className={`rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none border transition ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500'
                  : 'bg-white border-slate-300 text-slate-700 focus:border-indigo-500 shadow-xs'
              }`}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center space-x-1">
        {/* First Page */}
        <button
          type="button"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(1)}
          className={`p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark
              ? 'border-slate-700 hover:bg-slate-750 text-slate-300'
              : 'border-slate-200 hover:bg-slate-100 text-slate-700 bg-white shadow-xs'
          }`}
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          className={`p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark
              ? 'border-slate-700 hover:bg-slate-750 text-slate-300'
              : 'border-slate-200 hover:bg-slate-100 text-slate-700 bg-white shadow-xs'
          }`}
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((num, idx) => {
            if (num === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-slate-400">
                  ...
                </span>
              );
            }
            const isCurrent = num === safeCurrentPage;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onPageChange(num as number)}
                className={`min-w-7 h-7 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDark
                    ? 'hover:bg-slate-750 text-slate-300 border border-slate-700/60'
                    : 'hover:bg-slate-100 text-slate-700 bg-white border border-slate-200 shadow-xs'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          disabled={safeCurrentPage >= totalPages}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          className={`p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark
              ? 'border-slate-700 hover:bg-slate-750 text-slate-300'
              : 'border-slate-200 hover:bg-slate-100 text-slate-700 bg-white shadow-xs'
          }`}
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          disabled={safeCurrentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark
              ? 'border-slate-700 hover:bg-slate-750 text-slate-300'
              : 'border-slate-200 hover:bg-slate-100 text-slate-700 bg-white shadow-xs'
          }`}
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
