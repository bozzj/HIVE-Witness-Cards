import React from 'react';
import { Search, RotateCw, RefreshCw, Filter, ArrowUpDown, CheckCircle2, ShieldCheck } from 'lucide-react';
import { FilterCategory, SortOption } from '../types/hive';

interface FilterControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeCategory: FilterCategory;
  onCategoryChange: (cat: FilterCategory) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onFlipAll: () => void;
  allFlipped: boolean;
  loggedInUser: string | null;
  userVotesCount: number;
  isProxied: boolean;
  proxyUser: string | null;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  onRefresh,
  isRefreshing,
  onFlipAll,
  allFlipped,
  loggedInUser,
  userVotesCount,
  isProxied,
  proxyUser,
}) => {
  return (
    <div className="space-y-3 mb-6">
      {/* Top Filter Bar: Search + Sort + Actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search witness by name or rank #..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort & Actions Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="rank" className="bg-slate-900 text-white">
                Rank (Votes)
              </option>
              <option value="hbd_rate_desc" className="bg-slate-900 text-white">
                HBD APR % (High to Low)
              </option>
              <option value="hp_desc" className="bg-slate-900 text-white">
                Witness Hive Power
              </option>
              <option value="missed_asc" className="bg-slate-900 text-white">
                Reliability (Least Missed)
              </option>
            </select>
          </div>

          {/* Flip All 25 Cards Switch */}
          <button
            type="button"
            onClick={onFlipAll}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
              allFlipped
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="Flip all cards on page between Front and Back"
          >
            <RotateCw className={`w-3.5 h-3.5 ${allFlipped ? 'rotate-180' : ''}`} />
            <span>{allFlipped ? 'Show Fronts' : 'Flip All to Stats'}</span>
          </button>

          {/* Live Reload Button */}
          <button
            type="button"
            disabled={isRefreshing}
            onClick={onRefresh}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Refresh Witness Blockchain Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Segmented Filter Controls */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => onCategoryChange('all')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeCategory === 'all'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Witnesses
        </button>

        <button
          onClick={() => onCategoryChange('top20')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeCategory === 'top20'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Top 20 Consensus
        </button>

        <button
          onClick={() => onCategoryChange('backup')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeCategory === 'backup'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Backup (21-100)
        </button>

        <button
          onClick={() => onCategoryChange('standby')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeCategory === 'standby'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Standby (&gt;100)
        </button>

        {/* Highlighted Voted Filter Button */}
        {loggedInUser && (
          <button
            onClick={() => onCategoryChange('voted')}
            className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeCategory === 'voted'
                ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-300'
                : 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-800/80'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {isProxied
                ? `Proxy Votes (${userVotesCount} via @${proxyUser})`
                : `My Voted Witnesses (${userVotesCount}/30)`}
            </span>
          </button>
        )}

        <button
          onClick={() => onCategoryChange('active')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeCategory === 'active'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Active Signers
        </button>
      </div>

      {/* Informative Proxy & Green Outline Banner */}
      {isProxied && proxyUser && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-700/70 text-xs text-emerald-200">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold text-white block">
                Proxy Active: Delegated to @{proxyUser}
              </span>
              <span className="text-[11px] text-emerald-300">
                Cards outline in <strong>bright green</strong> show all {userVotesCount} witnesses currently backed by your proxy on the blockchain.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onCategoryChange('voted')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-sm ${
              activeCategory === 'voted'
                ? 'bg-slate-900 text-emerald-300 border border-emerald-600'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {activeCategory === 'voted' ? 'Viewing Voted Cards' : `Filter to ${userVotesCount} Proxy Votes`}
          </button>
        </div>
      )}

      {/* Direct Voting Active Status Banner */}
      {!isProxied && loggedInUser && userVotesCount > 0 && activeCategory !== 'voted' && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-900/60 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              You have <strong>{userVotesCount} of 30</strong> active witness votes, highlighted with a <strong>green outline</strong>.
            </span>
          </div>
          <button
            onClick={() => onCategoryChange('voted')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 whitespace-nowrap ml-2"
          >
            Filter to My {userVotesCount} Votes →
          </button>
        </div>
      )}
    </div>
  );
};
