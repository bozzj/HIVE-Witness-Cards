import React from 'react';
import { DynamicGlobalProperties } from '../types/hive';
import { formatCompactNumber } from '../services/hiveApi';
import stadiumBg from '../assets/images/baseball_stadium_lights_1791144600642.jpg';

interface StatsBannerProps {
  globalProps: DynamicGlobalProperties | null;
  totalWitnesses: number;
  top20Count: number;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({
  globalProps,
  totalWitnesses,
  top20Count,
}) => {
  const headBlock = globalProps?.head_block_number
    ? globalProps.head_block_number.toLocaleString()
    : '---';

  const consensusApr = globalProps?.hbd_interest_rate
    ? (globalProps.hbd_interest_rate / 100).toFixed(2)
    : '10.00';

  const currentWitness = globalProps?.current_witness || 'witness';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 mb-6 shadow-xl">
      {/* Stadium Atmospheric Background Overlay */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <img
          src={stadiumBg}
          alt="Stadium Lights"
          className="w-full h-full object-cover object-center filter blur-xs"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/70" />
      </div>

      <div className="relative z-10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
              Hive Blockchain Witnesses
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Official Witness Roster & Trading Cards
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
            Browse the decentralized consensus producers securing the Hive blockchain. Flip cards to
            inspect HBD interest rate policies, node hardware metrics, and vote using Hive Keychain.
          </p>
        </div>

        {/* Live Network Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 backdrop-blur-sm">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
              Head Block
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-white tabular-nums">
              #{headBlock}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
              Consensus HBD APR
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-amber-400 tabular-nums">
              {consensusApr}%
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
              Total Roster
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-slate-200 tabular-nums">
              {totalWitnesses} Witnesses
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
              Signing Block
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-emerald-400 truncate block tabular-nums">
              @{currentWitness}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
