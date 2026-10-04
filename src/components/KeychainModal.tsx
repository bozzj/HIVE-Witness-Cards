import React, { useState } from 'react';
import { Shield, Key, AlertCircle, CheckCircle2, ExternalLink, X, User } from 'lucide-react';
import { isKeychainAvailable } from '../services/hiveKeychain';

interface KeychainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string) => Promise<void>;
  currentUsername: string | null;
}

export const KeychainModal: React.FC<KeychainModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  currentUsername,
}) => {
  const [usernameInput, setUsernameInput] = useState(currentUsername || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasKeychain = isKeychainAvailable();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = usernameInput.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUser) {
      setErrorMsg('Please enter a valid Hive username.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await onLogin(cleanUser);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not fetch user votes from Hive blockchain.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoUser: string) => {
    setUsernameInput(demoUser);
    onLogin(demoUser).then(() => onClose()).catch((err) => setErrorMsg(err.message));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Hive Witness Voting</h3>
            <p className="text-xs text-slate-400">Connect to highlight & vote for witnesses</p>
          </div>
        </div>

        {/* Keychain Status Indicator */}
        <div
          className={`p-3 rounded-xl border text-xs mb-4 flex items-start gap-2.5 ${
            hasKeychain
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
          }`}
        >
          {hasKeychain ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-semibold block">
              {hasKeychain ? 'Hive Keychain Detected' : 'Keychain Not Detected In This Browser'}
            </span>
            <span className="text-[11px] opacity-90 block mt-0.5">
              {hasKeychain
                ? 'Your Keychain extension is ready for instant 1-click witness voting.'
                : 'You can still enter any Hive username to highlight your voted cards, and vote with HiveSigner!'}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Hive Account Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono">
                @
              </span>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="e.g. blocktrades, gtg, yourname"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono transition-all"
                autoFocus
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-sm shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Key className="w-4 h-4" />
            <span>{loading ? 'Fetching Votes...' : 'Load Witness Votes'}</span>
          </button>
        </form>

        {/* Quick Demo Selector */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 font-medium">
              Or test with active witness accounts:
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              Supports Direct & Proxy Votes
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['mrsbozz', 'blocktrades', 'ausbitbank', 'gtg', 'theycallmedan', 'arcange'].map((demo) => (
              <button
                key={demo}
                type="button"
                onClick={() => handleQuickDemo(demo)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  demo === 'mrsbozz'
                    ? 'bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold hover:bg-emerald-900'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                @{demo}
              </button>
            ))}
          </div>
        </div>

        {/* Info on Keychain */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Need Hive Keychain?</span>
          <a
            href="https://hive-keychain.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <span>hive-keychain.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
