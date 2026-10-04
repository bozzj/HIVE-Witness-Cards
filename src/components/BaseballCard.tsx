import React, { useState } from 'react';
import {
  RotateCw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Coins,
  Percent,
  Activity,
  Layers,
  Award,
  Vote,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { WitnessCardData } from '../types/hive';
import {
  formatCompactNumber,
  formatExactNumber,
  formatRelativeTime,
  getHiveAvatarUrl,
  vestsToHP,
} from '../services/hiveApi';
import { getHiveSignerVoteUrl } from '../services/hiveKeychain';
import goldMedallionImg from '../assets/images/witness_gold_medallion_1791144610850.jpg';

interface BaseballCardProps {
  witness: WitnessCardData;
  isVotedByMe: boolean;
  isProxiedVote?: boolean;
  proxyUser?: string | null;
  isFlipped: boolean;
  onFlipToggle: (witnessOwner: string) => void;
  onVoteToggle: (witnessOwner: string, currentVoted: boolean) => Promise<void>;
  isVotingPending: boolean;
  loggedInUser: string | null;
  globalProps: any;
}

export const BaseballCard: React.FC<BaseballCardProps> = ({
  witness,
  isVotedByMe,
  isProxiedVote = false,
  proxyUser = null,
  isFlipped,
  onFlipToggle,
  onVoteToggle,
  isVotingPending,
  loggedInUser,
  globalProps,
}) => {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = getHiveAvatarUrl(witness.owner, witness.profileImageUrl);

  // Compute witness's own HP from vesting_shares if account details loaded
  const personalHP = witness.accountDetails?.vesting_shares
    ? vestsToHP(witness.accountDetails.vesting_shares, globalProps)
    : witness.hivePower || 0;

  // Power down stats
  const toWithdrawVests = parseFloat(String(witness.accountDetails?.to_withdraw || '0')) / 1e6;
  const withdrawnVests = parseFloat(String(witness.accountDetails?.withdrawn || '0')) / 1e6;
  const toWithdrawHP = vestsToHP(toWithdrawVests, globalProps);
  const withdrawnHP = vestsToHP(withdrawnVests, globalProps);
  const isPoweringDown = toWithdrawVests > 0 && toWithdrawVests > withdrawnVests;

  // Next withdrawal date
  const nextWithdrawal = witness.accountDetails?.next_vesting_withdrawal;
  const hasNextWithdrawalDate =
    nextWithdrawal &&
    !nextWithdrawal.startsWith('1969') &&
    !nextWithdrawal.startsWith('1970');

  // Liquid and Savings balances
  const liquidHbd = witness.accountDetails?.hbd_balance || '0.000 HBD';
  const savingsHbd = witness.accountDetails?.savings_hbd_balance || '0.000 HBD';
  const liquidHive = witness.accountDetails?.balance || '0.000 HIVE';
  const savingsHive = witness.accountDetails?.savings_balance || '0.000 HIVE';

  // Exchange rate / KE ratio
  const exchangeRate =
    witness.hbd_exchange_rate || witness.sbd_exchange_rate;
  const exchangeText = exchangeRate
    ? `${exchangeRate.base} / ${exchangeRate.quote}`
    : 'No Feed';

  const feedTimeAgo = formatRelativeTime(
    witness.last_hbd_exchange_update || witness.last_sbd_exchange_update
  );

  return (
    <div className="perspective-1500 w-full h-[470px] select-none group">
      {/* 3D Inner Container */}
      <div
        className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* ========================================================
            CARD FRONT - VINTAGE COLLECTIBLE BASEBALL CARD DESIGN
           ======================================================== */}
        <div
          onClick={() => onFlipToggle(witness.owner)}
          className={`absolute inset-0 w-full h-full rounded-2xl p-2.5 backface-hidden cursor-pointer flex flex-col justify-between transition-all duration-300 ${
            isVotedByMe
              ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/80 ring-4 ring-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)] border-2 border-emerald-400'
              : witness.isTop20
              ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/30 ring-1 ring-amber-500/40 hover:ring-amber-400 shadow-xl'
              : 'bg-gradient-to-b from-slate-900 to-slate-950 ring-1 ring-slate-800 hover:ring-slate-700 shadow-lg'
          }`}
        >
          {/* Card Frame Inset with Double Pinstripe */}
          <div className={`relative flex flex-col justify-between h-full w-full rounded-xl bg-slate-900/90 p-2.5 border overflow-hidden ${
            isVotedByMe ? 'border-emerald-500/60' : 'border-slate-700/60'
          }`}>
            {/* Top Pennant / Rank Banner */}
            <div className="flex items-center justify-between gap-1 z-10">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-['Bebas_Neue'] text-xl tracking-wider px-2 py-0.5 rounded leading-none ${
                    isVotedByMe
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                      : witness.isTop20
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-sm'
                      : witness.rank <= 100
                      ? 'bg-slate-800 text-slate-200 border border-slate-700'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  #{witness.rank}
                </span>

                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {witness.isTop20 ? 'Consensus Top 20' : witness.rank <= 100 ? 'Backup Witness' : 'Standby'}
                </span>
              </div>

              {/* Status / Active Node Indicator */}
              <div className="flex items-center gap-1">
                {witness.isActive ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    v{witness.running_version}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-950/50 border border-rose-800/60 px-1.5 py-0.5 rounded">
                    Disabled
                  </span>
                )}
              </div>
            </div>

            {/* Voted By User Badge with Green Styling */}
            {isVotedByMe && (
              <div
                className={`absolute top-9 right-3 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full shadow-lg border text-[10px] font-extrabold uppercase tracking-wider ${
                  isProxiedVote
                    ? 'bg-emerald-600 text-white border-emerald-300'
                    : 'bg-emerald-400 text-slate-950 border-emerald-200'
                }`}
              >
                {isProxiedVote ? (
                  <>
                    <ShieldCheck className="w-3 h-3 text-white shrink-0" />
                    <span className="truncate max-w-[110px]">Via @{proxyUser}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-slate-950 shrink-0" />
                    <span>My Vote</span>
                  </>
                )}
              </div>
            )}

            {/* Central Portrait Cutout with Arch Baseball Window */}
            <div className="relative my-2 flex-1 flex flex-col items-center justify-center">
              <div
                className={`relative w-36 h-36 rounded-full p-1 shadow-2xl transition-transform group-hover:scale-105 duration-300 ${
                  isVotedByMe
                    ? 'bg-gradient-to-tr from-emerald-600 via-emerald-400 to-teal-300 ring-2 ring-emerald-400'
                    : witness.isTop20
                    ? 'bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-500'
                    : 'bg-gradient-to-tr from-slate-700 via-slate-500 to-slate-800'
                }`}
              >
                {/* Gold Medallion Inset for Top 20 */}
                {witness.isTop20 && (
                  <img
                    src={goldMedallionImg}
                    alt="Consensus Medallion"
                    className="absolute -bottom-2 -left-2 w-9 h-9 rounded-full z-10 shadow-md border border-amber-300"
                  />
                )}

                <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 flex items-center justify-center">
                  {!imageError ? (
                    <img
                      src={avatarUrl}
                      alt={witness.owner}
                      referrerPolicy="no-referrer"
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-amber-400 font-['Bebas_Neue'] text-3xl">
                      {witness.owner.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Player Name Banner (Styled Vintage Sports Ribbon) */}
              <div className="mt-2 text-center w-full px-2">
                <h3 className="font-['Bebas_Neue'] text-2xl tracking-wide text-white leading-tight truncate">
                  @{witness.owner}
                </h3>
                {witness.displayName && witness.displayName !== witness.owner && (
                  <p className="text-xs text-slate-400 truncate max-w-[190px] mx-auto -mt-0.5">
                    {witness.displayName}
                  </p>
                )}
              </div>
            </div>

            {/* KEY FRONT METRIC: HBD Interest Rate Badge */}
            <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 my-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  HBD Interest Rate
                </span>
                <span className="font-mono font-bold text-amber-400 text-sm tabular-nums">
                  {(witness.hbdInterestPercent ?? 0).toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((witness.hbdInterestPercent ?? 0) / 30) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Bottom Front Stats: Total Vote Weight & Feed */}
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-300 py-1 border-t border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Vote Power</span>
                <span className="font-bold text-slate-100 tabular-nums">
                  {formatCompactNumber(witness.voteHP || 0)} HP
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Price Feed</span>
                <span className="font-bold text-slate-100 tabular-nums truncate block">
                  {exchangeRate ? exchangeRate.base.replace(' HBD', '$') : 'N/A'}
                </span>
              </div>
            </div>

            {/* Interactive Flip Hint */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 hover:text-amber-400 transition-colors">
                <RotateCw className="w-3 h-3 text-amber-400 animate-spin-slow" />
                Flip for Stats
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Missed: {witness.total_missed ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD BACK - VINTAGE BASEBALL STATS & HIVE METRICS
           ======================================================== */}
        <div
          className={`absolute inset-0 w-full h-full rounded-2xl p-2.5 backface-hidden rotate-y-180 flex flex-col justify-between transition-all duration-300 ${
            isVotedByMe
              ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/80 ring-4 ring-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)] border-2 border-emerald-400'
              : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 ring-1 ring-slate-800'
          }`}
        >
          {/* Inner Card Stock */}
          <div className="relative flex flex-col justify-between h-full w-full rounded-xl bg-slate-950 p-2.5 border border-slate-800 overflow-y-auto">
            {/* Header: Name, Rank, Return Flip Button */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-1.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-['Bebas_Neue'] text-lg text-amber-400">
                    #{witness.rank}
                  </span>
                  <h4 className="font-bold text-white text-sm truncate max-w-[130px]">
                    @{witness.owner}
                  </h4>
                </div>
                <p className="text-[10px] text-slate-400">
                  Witness since {witness.created ? witness.created.split('T')[0] : 'Genesis'}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlipToggle(witness.owner);
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded flex items-center gap-1 transition-colors"
                title="Flip to front"
              >
                <RotateCw className="w-3 h-3" />
                Front
              </button>
            </div>

            {/* Voting Status Highlight on Card Back */}
            {isVotedByMe && (
              <div className="mt-1 p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] flex items-center justify-between font-medium">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  {isProxiedVote
                    ? `Supported via your proxy @${proxyUser}`
                    : 'Active direct witness vote on chain'}
                </span>
                <span className="text-[9px] text-emerald-400 font-mono font-bold uppercase">
                  {isProxiedVote ? 'Proxied' : 'Direct'}
                </span>
              </div>
            )}

            {/* STATS MATRIX: Authentic Card Back Grid */}
            <div className="my-1.5 space-y-1.5 text-xs">
              {/* 1. Witness's Own HIVE Power */}
              <div className="bg-slate-900/90 rounded p-1.5 border border-slate-800/80">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    Witness Hive Power
                  </span>
                  <span className="font-mono font-bold text-cyan-400 tabular-nums">
                    {personalHP > 0 ? `${formatExactNumber(personalHP, 0)} HP` : 'Loading...'}
                  </span>
                </div>
              </div>

              {/* 2. KE Ratio / Exchange Feed */}
              <div className="bg-slate-900/90 rounded p-1.5 border border-slate-800/80">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    KE Ratio / Feed Price
                  </span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    {exchangeText}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Last feed publish:</span>
                  <span>{feedTimeAgo}</span>
                </div>
              </div>

              {/* 3. HBD Holdings (Liquid & Savings) */}
              <div className="bg-slate-900/90 rounded p-1.5 border border-slate-800/80">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    HBD Holdings
                  </span>
                  <span className="font-mono font-bold text-slate-200 tabular-nums">
                    {liquidHbd}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>In HBD Savings:</span>
                  <span className="text-amber-300 font-mono">{savingsHbd}</span>
                </div>
              </div>

              {/* 4. Power Down Statistics */}
              <div className="bg-slate-900/90 rounded p-1.5 border border-slate-800/80">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-purple-400" />
                    Power Down Status
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      isPoweringDown
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPoweringDown ? 'Active Power Down' : 'None Active'}
                  </span>
                </div>
                {isPoweringDown ? (
                  <div className="mt-1 text-[10px] text-slate-400 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Remaining:</span>
                      <span className="font-mono text-slate-200 tabular-nums">
                        {formatCompactNumber(toWithdrawHP - withdrawnHP)} HP
                      </span>
                    </div>
                    {hasNextWithdrawalDate && (
                      <div className="flex justify-between">
                        <span>Next execution:</span>
                        <span className="font-mono text-slate-300">
                          {formatRelativeTime(nextWithdrawal)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Account not powering down HP.
                  </div>
                )}
              </div>

              {/* 5. Production Reliability & Chain Props */}
              <div className="bg-slate-900/90 rounded p-1.5 border border-slate-800/80 text-[10px] font-mono space-y-0.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Blocks Missed:</span>
                  <span className="text-rose-400 font-bold tabular-nums">
                    {(witness.total_missed ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Creation Fee / Block Size:</span>
                  <span>
                    {witness.props?.account_creation_fee || '3.000 HIVE'} · {witness.props?.maximum_block_size ? Math.round(witness.props.maximum_block_size / 1024) : 64}KB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Confirmed Block:</span>
                  <span className="tabular-nums">#{witness.last_confirmed_block_num ?? 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Card Back Footer: External link + Blockchain Voting Button */}
            <div className="pt-1.5 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                {witness.url ? (
                  <a
                    href={witness.url.startsWith('http') ? witness.url : `https://${witness.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] truncate max-w-[130px]"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    Witness Thread
                  </a>
                ) : (
                  <span className="text-slate-400 text-[10px]">No thread URL</span>
                )}

                <a
                  href={`https://peakd.com/@${witness.owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-slate-400 hover:text-slate-200 text-[10px]"
                >
                  PeakD Profile ↗
                </a>
              </div>

              {/* Hive Keychain Vote / Unvote Button */}
              <button
                type="button"
                disabled={isVotingPending}
                onClick={(e) => {
                  e.stopPropagation();
                  onVoteToggle(witness.owner, isVotedByMe && !isProxiedVote);
                }}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  isVotingPending
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : isVotedByMe && !isProxiedVote
                    ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60'
                    : isProxiedVote
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 font-bold'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-300 font-bold'
                }`}
              >
                {isVotingPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Updating Vote...
                  </>
                ) : isVotedByMe && !isProxiedVote ? (
                  <>
                    <Vote className="w-3.5 h-3.5" />
                    Remove Witness Vote
                  </>
                ) : isProxiedVote ? (
                  <>
                    <Vote className="w-3.5 h-3.5" />
                    Vote Directly (Clears Proxy)
                  </>
                ) : (
                  <>
                    <Vote className="w-3.5 h-3.5" />
                    Vote with Keychain
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
