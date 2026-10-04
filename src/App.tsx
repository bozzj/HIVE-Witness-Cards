import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DynamicGlobalProperties,
  FilterCategory,
  SortOption,
  WitnessCardData,
} from './types/hive';
import {
  fetchWitnesses,
  fetchDynamicGlobalProperties,
  fetchAccounts,
  fetchAccountAndEffectiveVotes,
  witnessVotesToHP,
  parseProfileMetadata,
  callHiveRpc,
} from './services/hiveApi';
import { isKeychainAvailable, voteWitnessKeychain, getHiveSignerVoteUrl } from './services/hiveKeychain';
import { Header } from './components/Header';
import { StatsBanner } from './components/StatsBanner';
import { FilterControls } from './components/FilterControls';
import { BaseballCard } from './components/BaseballCard';
import { Pagination } from './components/Pagination';
import { KeychainModal } from './components/KeychainModal';
import { HiveLogo } from './components/HiveLogo';
import { AlertCircle, CheckCircle2, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import snapshotData from './data/witnessSnapshot.json';

const PAGE_SIZE = 25; // 5 across by 5 long = 25 cards per page

function processRawWitnesses(
  rawList: any[],
  gProps: DynamicGlobalProperties,
  accountsList: any[] = []
): WitnessCardData[] {
  return rawList.map((w, index) => {
    const rank = index + 1;
    const isTop20 = rank <= 20;
    const isActive = w.signing_key !== 'STM1111111111111111111111111111111114T1Anm';
    const hbdInterestPercent = (w.props?.hbd_interest_rate || 0) / 100;
    const voteHP = witnessVotesToHP(w.votes, gProps);

    const exchangeRate = w.hbd_exchange_rate || w.sbd_exchange_rate;
    const exchangeRateText = exchangeRate
      ? `${exchangeRate.base} / ${exchangeRate.quote}`
      : 'No Feed';

    const account = accountsList.find((a) => a.name === w.owner);
    const profile = parseProfileMetadata(account?.posting_json_metadata || account?.json_metadata);

    return {
      ...w,
      rank,
      isTop20,
      isActive,
      hbdInterestPercent,
      voteHP,
      voteWeightPct: 0,
      exchangeRateText,
      lastFeedUpdateText: w.last_hbd_exchange_update || w.last_sbd_exchange_update || '',
      accountDetails: account,
      displayName: profile.displayName,
      aboutText: profile.about,
      profileImageUrl: profile.profileImage,
    };
  });
}

export default function App() {
  // Blockchain State with immediate snapshot initialization for instant rendering
  const [globalProps, setGlobalProps] = useState<DynamicGlobalProperties>(
    () => snapshotData.globalProps as unknown as DynamicGlobalProperties
  );

  const [witnesses, setWitnesses] = useState<WitnessCardData[]>(() => {
    return processRawWitnesses(
      snapshotData.witnesses,
      snapshotData.globalProps as unknown as DynamicGlobalProperties,
      snapshotData.accounts
    );
  });

  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User & Keychain State
  const [loggedInUser, setLoggedInUser] = useState<string | null>(() => {
    return localStorage.getItem('hive_witness_user') || null;
  });
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [userProxy, setUserProxy] = useState<string | null>(null);
  const [isProxied, setIsProxied] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [votingPendingWitness, setVotingPendingWitness] = useState<string | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Display & Navigation State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('rank');
  const [currentPage, setCurrentPage] = useState(1);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [allFlipped, setAllFlipped] = useState(false);

  // Auto clear toast
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Fetch initial blockchain witness roster
  const loadBlockchainData = useCallback(async () => {
    try {
      setError(null);
      const [gProps, rawWitnesses] = await Promise.all([
        fetchDynamicGlobalProperties(),
        fetchWitnesses(150),
      ]);

      setGlobalProps(gProps);

      // Process and format witness items, preserving existing account details if loaded
      setWitnesses((prevWitnesses) => {
        return rawWitnesses.map((w, index) => {
          const rank = index + 1;
          const isTop20 = rank <= 20;
          const isActive = w.signing_key !== 'STM1111111111111111111111111111111114T1Anm';
          const hbdInterestPercent = (w.props?.hbd_interest_rate || 0) / 100;
          const voteHP = witnessVotesToHP(w.votes, gProps);

          const exchangeRate = w.hbd_exchange_rate || w.sbd_exchange_rate;
          const exchangeRateText = exchangeRate
            ? `${exchangeRate.base} / ${exchangeRate.quote}`
            : 'No Feed';

          const existing = prevWitnesses.find((p) => p.owner === w.owner);

          return {
            ...w,
            rank,
            isTop20,
            isActive,
            hbdInterestPercent,
            voteHP,
            voteWeightPct: 0,
            exchangeRateText,
            lastFeedUpdateText: w.last_hbd_exchange_update || w.last_sbd_exchange_update || '',
            accountDetails: existing?.accountDetails,
            displayName: existing?.displayName,
            aboutText: existing?.aboutText,
            profileImageUrl: existing?.profileImageUrl,
            hivePower: existing?.hivePower,
          };
        });
      });
    } catch (err: any) {
      console.warn('Network sync notice:', err);
      // Only set blocking error banner if we have no witness cards to display at all
      setWitnesses((curr) => {
        if (!curr || curr.length === 0) {
          setError(err?.message || 'Failed to communicate with Hive RPC nodes.');
        }
        return curr;
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load user's vote history and resolve proxy votes
  const loadUserData = useCallback(async (username: string) => {
    try {
      const voteProfile = await fetchAccountAndEffectiveVotes(username);
      const effectiveVotes = voteProfile.effectiveVotes || [];
      setUserVotes(effectiveVotes);
      setUserProxy(voteProfile.proxy);
      setIsProxied(voteProfile.isProxied);
      localStorage.setItem('hive_witness_user', username);
      setLoggedInUser(username);

      if (voteProfile.isProxied && voteProfile.proxy) {
        showToast(
          `Account @${username} proxies votes to @${voteProfile.proxy}. All ${effectiveVotes.length} proxy witness votes are highlighted with green outlines!`,
          'success'
        );
      } else {
        showToast(
          `Loaded ${effectiveVotes.length}/30 witness votes for @${username}. All highlighted with green outlines!`,
          'success'
        );
      }

      // Check if any voted witnesses are not yet in our witnesses roster
      setWitnesses((currentList) => {
        const existingOwners = new Set(currentList.map((w) => w.owner));
        const missingVotedOwners = effectiveVotes.filter((owner) => !existingOwners.has(owner));

        if (missingVotedOwners.length > 0) {
          Promise.all(
            missingVotedOwners.map((owner) =>
              callHiveRpc<any>('condenser_api.get_witness_by_account', [owner]).catch(() => null)
            )
          ).then((fetchedWitnesses) => {
            const validWitnesses = fetchedWitnesses.filter(Boolean);
            if (validWitnesses.length > 0) {
              setWitnesses((latest) => {
                const latestExisting = new Set(latest.map((w) => w.owner));
                const newItems: WitnessCardData[] = [];
                validWitnesses.forEach((w) => {
                  if (!latestExisting.has(w.owner)) {
                    const rank = latest.length + newItems.length + 1;
                    const exchangeRate = w.hbd_exchange_rate || w.sbd_exchange_rate;
                    newItems.push({
                      ...w,
                      rank,
                      isTop20: false,
                      isActive: w.signing_key !== 'STM1111111111111111111111111111111114T1Anm',
                      hbdInterestPercent: (w.props?.hbd_interest_rate || 0) / 100,
                      voteHP: witnessVotesToHP(w.votes, globalProps),
                      voteWeightPct: 0,
                      exchangeRateText: exchangeRate ? `${exchangeRate.base} / ${exchangeRate.quote}` : 'No Feed',
                      lastFeedUpdateText: w.last_hbd_exchange_update || '',
                    });
                  }
                });
                return [...latest, ...newItems];
              });
            }
          });
        }
        return currentList;
      });
    } catch (err: any) {
      console.error('Failed to load user account:', err);
      showToast(err.message || 'Error fetching account votes', 'error');
      throw err;
    }
  }, [globalProps, showToast]);

  // Initial load
  useEffect(() => {
    loadBlockchainData();
  }, [loadBlockchainData]);

  // On loggedInUser change
  useEffect(() => {
    if (loggedInUser) {
      loadUserData(loggedInUser);
    }
  }, [loggedInUser, loadUserData]);

  // Filter and Sort witnesses
  const filteredAndSortedWitnesses = useMemo(() => {
    let result = [...witnesses];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (w) =>
          w.owner.toLowerCase().includes(q) ||
          w.rank.toString() === q ||
          w.displayName?.toLowerCase().includes(q)
      );
    }

    // Category filter: 'voted' filters down strictly to user's direct or proxied witnesses!
    switch (activeCategory) {
      case 'top20':
        result = result.filter((w) => w.isTop20);
        break;
      case 'backup':
        result = result.filter((w) => w.rank > 20 && w.rank <= 100);
        break;
      case 'standby':
        result = result.filter((w) => w.rank > 100);
        break;
      case 'voted':
        result = result.filter((w) => userVotes.includes(w.owner));
        break;
      case 'active':
        result = result.filter((w) => w.isActive);
        break;
      case 'all':
      default:
        break;
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'hbd_rate_desc':
          return (b.hbdInterestPercent ?? 0) - (a.hbdInterestPercent ?? 0);
        case 'hp_desc':
          return (b.hivePower ?? 0) - (a.hivePower ?? 0);
        case 'missed_asc':
          return (a.total_missed ?? 0) - (b.total_missed ?? 0);
        case 'votes_desc':
        case 'rank':
        default:
          return (a.rank ?? 9999) - (b.rank ?? 9999);
      }
    });

    return result;
  }, [witnesses, searchQuery, activeCategory, userVotes, sortBy]);

  // Total pages calculation for 5x5 layout (25 per page)
  const totalPages = Math.ceil(filteredAndSortedWitnesses.length / PAGE_SIZE) || 1;

  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Slice currently visible 25 cards
  const currentWitnessesOnPage = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedWitnesses.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedWitnesses, currentPage]);

  // Batch fetch full account details for the 25 witnesses on the current page
  useEffect(() => {
    if (!currentWitnessesOnPage.length || !globalProps) return;

    // Accounts that don't have accountDetails yet
    const pendingOwners = currentWitnessesOnPage
      .filter((w) => !w.accountDetails)
      .map((w) => w.owner);

    if (pendingOwners.length === 0) return;

    fetchAccounts(pendingOwners)
      .then((accountList) => {
        if (!accountList || !accountList.length) return;

        setWitnesses((prev) =>
          prev.map((w) => {
            const acc = accountList.find((a) => a.name === w.owner);
            if (!acc) return w;

            const profile = parseProfileMetadata(acc.posting_json_metadata || acc.json_metadata);
            return {
              ...w,
              accountDetails: acc,
              displayName: profile.displayName || w.displayName,
              aboutText: profile.about,
              profileImageUrl: profile.profileImage,
            };
          })
        );
      })
      .catch((err) => {
        console.warn('Could not fetch batch accounts for current page:', err);
      });
  }, [currentWitnessesOnPage, globalProps]);

  // Toggle individual card flip
  const handleFlipToggle = (owner: string) => {
    setFlippedCards((prev) => ({
      ...prev,
      [owner]: !prev[owner],
    }));
  };

  // Flip All toggle for the current 25 cards
  const handleFlipAll = () => {
    const nextState = !allFlipped;
    setAllFlipped(nextState);
    const updated: Record<string, boolean> = {};
    currentWitnessesOnPage.forEach((w) => {
      updated[w.owner] = nextState;
    });
    setFlippedCards((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  // Hive Keychain / Blockchain Voting Handler
  const handleVoteToggle = async (witnessOwner: string, currentVoted: boolean) => {
    if (!loggedInUser) {
      setIsLoginModalOpen(true);
      return;
    }

    const approve = !currentVoted;
    setVotingPendingWitness(witnessOwner);

    if (isProxied) {
      showToast(
        `Note: Voting directly for @${witnessOwner} will replace your proxy delegation to @${userProxy} on the blockchain.`,
        'info'
      );
    }

    if (isKeychainAvailable()) {
      try {
        const response = await voteWitnessKeychain(loggedInUser, witnessOwner, approve);
        if (response.success) {
          // If user had proxy, voting directly clears proxy
          if (isProxied) {
            setIsProxied(false);
            setUserProxy(null);
            setUserVotes([witnessOwner]);
          } else {
            setUserVotes((prev) =>
              approve ? [...prev, witnessOwner] : prev.filter((name) => name !== witnessOwner)
            );
          }

          showToast(
            approve
              ? `Successfully voted for witness @${witnessOwner}!`
              : `Removed vote for witness @${witnessOwner}.`,
            'success'
          );

          // Re-sync user details from chain
          setTimeout(() => {
            loadUserData(loggedInUser);
          }, 1500);
        } else {
          showToast(response.error || response.message || 'Keychain vote was rejected.', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'Error executing Keychain vote', 'error');
      } finally {
        setVotingPendingWitness(null);
      }
    } else {
      // HiveSigner fallback: safely dispatch navigation
      const signerUrl = getHiveSignerVoteUrl(witnessOwner, approve);
      try {
        const link = document.createElement('a');
        link.href = signerUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Opened HiveSigner to ${approve ? 'approve' : 'remove'} @${witnessOwner}.`, 'info');
      } catch (err) {
        console.warn('Direct popup prevented, providing fallback URL:', err);
        showToast(`Please open HiveSigner: ${signerUrl}`, 'info');
      }
      setVotingPendingWitness(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hive_witness_user');
    setLoggedInUser(null);
    setUserVotes([]);
    setUserProxy(null);
    setIsProxied(false);
    showToast('Logged out of Hive Keychain session.', 'info');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBlockchainData();
    if (loggedInUser) {
      loadUserData(loggedInUser);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans']">
      {/* Top Bar Contract Navigation */}
      <Header
        loggedInUser={loggedInUser}
        userVotesCount={userVotes.length}
        userProxy={userProxy}
        isProxied={isProxied}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onCategoryChange={(cat) => {
          setActiveCategory(cat);
          setCurrentPage(1);
        }}
        activeCategory={activeCategory}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Network & Roster Stats Banner with Stadium Background */}
        <StatsBanner
          globalProps={globalProps}
          totalWitnesses={witnesses.length}
          top20Count={witnesses.filter((w) => w.isTop20).length}
        />

        {/* Global Toast / Feedback Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-medium border animate-slide-up ${
              toast.type === 'success'
                ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950 border-rose-700 text-rose-200'
                : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search, Filter Tabs, Sort, and Flip All Controls */}
        <FilterControls
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          activeCategory={activeCategory}
          onCategoryChange={(cat) => {
            setActiveCategory(cat);
            setCurrentPage(1);
          }}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onFlipAll={handleFlipAll}
          allFlipped={allFlipped}
          loggedInUser={loggedInUser}
          userVotesCount={userVotes.length}
          isProxied={isProxied}
          proxyUser={userProxy}
        />

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-rose-900 hover:bg-rose-800 rounded font-semibold text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
            <p className="text-sm font-medium text-slate-300">
              Loading Hive Blockchain Witnesses & Node Telemetry...
            </p>
          </div>
        ) : filteredAndSortedWitnesses.length === 0 ? (
          /* Empty State */
          <div className="py-20 text-center rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-500 shadow-md">
              <HiveLogo className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Witnesses Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {activeCategory === 'voted'
                ? isProxied
                  ? `Proxy @${userProxy} has not cast any witness votes yet.`
                  : 'You have not cast any witness votes yet on the blockchain.'
                : `No witnesses match the selected filter or search term "${searchQuery}".`}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="px-4 py-2 bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow hover:bg-amber-300 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* 5 Across by 5 Long Grid Layout (25 Cards Per Page) */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {currentWitnessesOnPage.map((witness) => {
                const isVoted = userVotes.includes(witness.owner);
                const isFlipped = Boolean(flippedCards[witness.owner]);
                const isPending = votingPendingWitness === witness.owner;

                return (
                  <BaseballCard
                    key={witness.owner}
                    witness={witness}
                    isVotedByMe={isVoted}
                    isProxiedVote={isProxied}
                    proxyUser={userProxy}
                    isFlipped={isFlipped}
                    onFlipToggle={handleFlipToggle}
                    onVoteToggle={handleVoteToggle}
                    isVotingPending={isPending}
                    loggedInUser={loggedInUser}
                    globalProps={globalProps}
                  />
                );
              })}
            </div>

            {/* 5x5 Grid Pagination (25 per page) */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedWitnesses.length}
              pageSize={PAGE_SIZE}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 mt-12 bg-slate-950 text-slate-400 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HiveLogo className="w-4 h-4 text-red-500" />
            <span className="font-['Bebas_Neue'] text-lg text-white">HIVE WITNESS CARDS</span>
            <span>·</span>
            <span>Decentralized Consensus Roster</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Data synced directly from Hive RPC</span>
            <span>·</span>
            <a
              href="https://hive-keychain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline"
            >
              Hive Keychain
            </a>
          </div>
        </div>
      </footer>

      {/* Hive Keychain / Account Login Modal */}
      <KeychainModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={loadUserData}
        currentUsername={loggedInUser}
      />
    </div>
  );
}
