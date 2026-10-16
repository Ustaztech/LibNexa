import React from 'react';
import { Category } from '../../types';
import { Filter, Layers, CheckSquare, Square, ArrowUpDown } from 'lucide-react';

interface FilterBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  availableOnly: boolean;
  onToggleAvailableOnly: () => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalResults: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  availableOnly,
  onToggleAvailableOnly,
  sortBy,
  onSortChange,
  totalResults,
}) => {
  return (
    <div className="space-y-3">
      {/* Category Pills Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onSelectCategory('ALL')}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedCategory === 'ALL'
              ? 'bg-brand-navy dark:bg-white text-white dark:text-brand-dark shadow-sm'
              : 'bg-white dark:bg-white/5 text-brand-dark dark:text-white/80 border border-brand-navy/10 dark:border-white/10 hover:border-brand-royal'
          }`}
        >
          All Subjects ({totalResults})
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id || selectedCategory === cat.name;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-brand-royal text-white shadow-sm font-semibold'
                  : 'bg-white dark:bg-white/5 text-brand-dark dark:text-white/80 border border-brand-navy/10 dark:border-white/10 hover:border-brand-royal'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Filter Options Row */}
      <div className="flex items-center justify-between flex-wrap gap-3 py-2 px-3 rounded-2xl bg-white dark:bg-white/5 border border-brand-navy/5 dark:border-white/10 text-xs">
        <div className="flex items-center gap-4">
          {/* Available Only Toggle */}
          <button
            onClick={onToggleAvailableOnly}
            className="flex items-center gap-2 text-brand-darkText dark:text-white/90 hover:text-brand-royal cursor-pointer font-medium select-none"
          >
            {availableOnly ? (
              <CheckSquare className="w-4 h-4 text-emerald-500" />
            ) : (
              <Square className="w-4 h-4 text-brand-mutedText" />
            )}
            <span>Available on Shelf Now</span>
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-brand-mutedText dark:text-white/50" />
          <span className="text-brand-mutedText dark:text-white/50">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-transparent text-brand-dark dark:text-white font-semibold focus:outline-none cursor-pointer pr-1"
          >
            <option value="newest" className="dark:bg-brand-navy">Newest Acquisitions</option>
            <option value="title" className="dark:bg-brand-navy">Title (A - Z)</option>
            <option value="popular" className="dark:bg-brand-navy">Most In-Demand</option>
          </select>
        </div>
      </div>
    </div>
  );
};
