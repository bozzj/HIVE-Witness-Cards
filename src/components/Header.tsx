import React from 'react';
import { Award, User, LogOut, Shield, ExternalLink, Sparkles } from 'lucide-react';
import { isKeychainAvailable } from '../services/hiveKeychain';
import { HiveLogo } from './HiveLogo';

interface HeaderProps {
  loggedInUser: string | null;
  userVotesCount: number;
  userProxy: string | null;
  isProxied: boolean;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onCategoryChange: (category: any) => void;
  activeCategory: string;
}

export const Header: React.FC<HeaderProps> = ({
  loggedInUser,
  userVotesCount,
  userProxy,
  isProxied,
  onOpenLoginModal,
  onLogout,
  onCategoryChange,
  activeCategory,
}) => {
  const hasKeychain = isKeychainAvailable();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 via-rose-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30 border border-red-400/30">
            <HiveLogo className="w-4.5 h-4.5 text-white" />
          </div>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onCategoryChange('all');
            }}
            className="text-lg font-bold tracking-tight text-white hover:text-red-400 transition-colors flex items-center gap-2"
          >
            <span>Hive Witness Cards</span>
          </a>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onCategoryChange('all')}
            className={`transition-colors hover:text-white ${
              activeCategory === 'all' ? 'text-amber-400 font-semibold' : 'text-slate-400'
            }`}
          >
            All Witnesses
          </button>
          <button
            onClick={() => onCategoryChange('top20')}
            className={`transition-colors hover:text-white flex items-center gap-1 ${
              activeCategory === 'top20' ? 'text-amber-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Top 20 Consensus
          </button>
          {loggedInUser && (
            <button
              onClick={() => onCategoryChange('voted')}
              className={`transition-colors hover:text-white flex items-center gap-1.5 ${
                activeCategory === 'voted' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{isProxied ? `Proxy Votes (${userVotesCount})` : `My Votes (${userVotesCount})`}</span>
            </button>
          )}
          <a
            href="https://hive.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Hive.io</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </nav>

        {/* Zone 3: Primary Actions (User login / Keychain connection) */}
        <div className="flex items-center gap-3">
          {loggedInUser ? (
            <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 border transition-all ${
              isProxied
                ? 'bg-slate-900 border-emerald-800/80 ring-1 ring-emerald-500/30'
                : 'bg-slate-900 border-slate-800'
            }`}>
              <img
                src={`https://images.hive.blog/u/${loggedInUser}/avatar/small`}
                alt={loggedInUser}
                className="w-6 h-6 rounded-full border border-emerald-400/60 object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="text-left text-xs">
                <span className="font-bold text-white block leading-tight">
                  @{loggedInUser}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {isProxied ? `Proxy: @${userProxy} (${userVotesCount})` : `${userVotesCount}/30 Votes`}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="ml-1 p-1 text-slate-400 hover:text-rose-400 transition-colors"
                title="Disconnect Account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-lg shadow transition-all flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-slate-950" />
              <span>Connect Keychain</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
