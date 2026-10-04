import {
  DynamicGlobalProperties,
  RawWitness,
  WitnessAccountDetails,
  WitnessCardData,
} from '../types/hive';
import snapshotData from '../data/witnessSnapshot.json';

export const HIVE_RPC_NODES = [
  '/api/hive-rpc', // Preferred same-origin server proxy
  'https://api.hive.blog',
  'https://api.openhive.network',
  'https://anyx.io',
  'https://rpc.mahdiyari.info',
  'https://api.deathwing.me',
];

let rpcIdCounter = 1;
function getNextRpcId(): number {
  rpcIdCounter = (rpcIdCounter % 100000) + 1;
  return rpcIdCounter;
}

/**
 * Execute a JSON-RPC request to Hive with automatic failover.
 * Prioritizes direct public nodes and the same-origin server proxy.
 */
export async function callHiveRpc<T = any>(method: string, params: any[] = []): Promise<T> {
  const requestBody = JSON.stringify({
    jsonrpc: '2.0',
    method,
    params,
    id: getNextRpcId(), // MUST be small integer, Date.now() causes 32-bit overflow on Hive nodes
  });

  // 1. First priority: Server proxy (runs with full network access and backend failover)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('/api/hive-rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const json = await response.json();
      if (!json.error && json.result !== undefined) {
        return json.result as T;
      }
      if (json.error) {
        console.warn('Proxy returned Hive error:', json.error);
      }
    }
  } catch (proxyErr) {
    console.warn('Server proxy request failed or timed out, trying direct nodes:', proxyErr);
  }

  // 2. Second priority: Direct public Hive nodes
  const publicNodes = [
    'https://api.hive.blog',
    'https://api.openhive.network',
    'https://anyx.io',
    'https://rpc.mahdiyari.info',
    'https://api.deathwing.me',
  ];

  let lastError: Error | null = null;
  for (const nodeUrl of publicNodes) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(nodeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const json = await response.json();
      if (json.error) {
        throw new Error(json.error.message || JSON.stringify(json.error));
      }

      if (json.result !== undefined) {
        return json.result as T;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // 3. Fallback: Only for global props and witness lists if completely offline
  if (method === 'condenser_api.get_dynamic_global_properties') {
    return snapshotData.globalProps as unknown as T;
  }
  if (method === 'condenser_api.get_witnesses_by_vote') {
    return snapshotData.witnesses as unknown as T;
  }
  if (method === 'condenser_api.get_accounts') {
    const requestedNames: string[] = (params[0] || []) as string[];
    const matched = (snapshotData.accounts as WitnessAccountDetails[]).filter((a) =>
      requestedNames.includes(a.name)
    );
    if (matched.length > 0) {
      return matched as unknown as T;
    }
    // DO NOT return [] if account is not in snapshot—throw a clear network error!
    throw new Error('Unable to connect to Hive blockchain network to look up account. Please check your network and retry.');
  }

  throw lastError || new Error('All Hive RPC nodes failed to respond.');
}

/**
 * Fetch dynamic global properties for calculating VESTS to Hive Power.
 */
export async function fetchDynamicGlobalProperties(): Promise<DynamicGlobalProperties> {
  return await callHiveRpc<DynamicGlobalProperties>('condenser_api.get_dynamic_global_properties', []);
}

/**
 * Fetch top witnesses sorted by vote weight.
 */
export async function fetchWitnesses(limit = 150): Promise<RawWitness[]> {
  // condenser_api.get_witnesses_by_vote takes [startWitnessName, limit]
  // We can fetch up to 100 per call, so if limit > 100, do 2 calls.
  if (limit <= 100) {
    return await callHiveRpc<RawWitness[]>('condenser_api.get_witnesses_by_vote', ['', limit]);
  }

  const batch1 = await callHiveRpc<RawWitness[]>('condenser_api.get_witnesses_by_vote', ['', 100]);
  if (!batch1 || batch1.length < 100) {
    return batch1 || [];
  }

  const lastOwner = batch1[batch1.length - 1].owner;
  const batch2 = await callHiveRpc<RawWitness[]>('condenser_api.get_witnesses_by_vote', [lastOwner, limit - 99]);

  // Remove duplicate cursor
  const merged = [...batch1, ...batch2.slice(1)];
  return merged;
}

/**
 * Fetch full account details for an array of account names.
 */
export async function fetchAccounts(names: string[]): Promise<WitnessAccountDetails[]> {
  if (!names.length) return [];
  const uniqueNames = Array.from(new Set(names));
  return await callHiveRpc<WitnessAccountDetails[]>('condenser_api.get_accounts', [uniqueNames]);
}

export interface UserVoteProfile {
  account: WitnessAccountDetails;
  directVotes: string[];
  effectiveVotes: string[];
  proxy: string | null;
  isProxied: boolean;
}

/**
 * Fetch account and resolve effective witness votes through proxy chain if set.
 */
export async function fetchAccountAndEffectiveVotes(username: string): Promise<UserVoteProfile> {
  const accounts = await fetchAccounts([username]);
  if (!accounts || accounts.length === 0) {
    throw new Error(`Account @${username} not found on Hive blockchain.`);
  }

  const userAccount = accounts[0];
  const directVotes = userAccount.witness_votes || [];
  const initialProxy = userAccount.proxy?.trim() || null;
  let currentProxy = initialProxy;
  let effectiveVotes = [...directVotes];
  let isProxied = false;

  // Follow proxy chain up to 4 hops
  const visitedProxies = new Set<string>();
  while (currentProxy && !visitedProxies.has(currentProxy) && visitedProxies.size < 4) {
    visitedProxies.add(currentProxy);
    try {
      const proxyAccounts = await fetchAccounts([currentProxy]);
      if (!proxyAccounts || proxyAccounts.length === 0) break;

      const proxyAcc = proxyAccounts[0];
      isProxied = true;
      effectiveVotes = proxyAcc.witness_votes || [];

      // Check if the proxy also delegates to another proxy
      if (proxyAcc.proxy && proxyAcc.proxy.trim() && !visitedProxies.has(proxyAcc.proxy.trim())) {
        currentProxy = proxyAcc.proxy.trim();
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return {
    account: userAccount,
    directVotes,
    effectiveVotes,
    proxy: initialProxy,
    isProxied,
  };
}

/**
 * Convert VESTS to Hive Power (HP)
 */
export function vestsToHP(
  vestsInput: string | number,
  globalProps: DynamicGlobalProperties | null
): number {
  if (!globalProps) return 0;
  const vests = typeof vestsInput === 'number' ? vestsInput : parseFloat(vestsInput) || 0;
  const totalVests = parseFloat(globalProps.total_vesting_shares) || 1;
  const totalFundHive = parseFloat(globalProps.total_vesting_fund_hive) || 0;

  return (vests / totalVests) * totalFundHive;
}

/**
 * Convert witness votes (stored in microvests) to Hive Power
 */
export function witnessVotesToHP(
  votesMicrovests: string | number,
  globalProps: DynamicGlobalProperties | null
): number {
  if (!globalProps) return 0;
  const rawVotes = typeof votesMicrovests === 'number' ? votesMicrovests : parseFloat(votesMicrovests) || 0;
  const vests = rawVotes / 1e6;
  return vestsToHP(vests, globalProps);
}

/**
 * Parse JSON metadata safe extractor
 */
export function parseProfileMetadata(jsonStr?: string): {
  displayName?: string;
  about?: string;
  profileImage?: string;
  website?: string;
  location?: string;
} {
  if (!jsonStr) return {};
  try {
    const parsed = JSON.parse(jsonStr);
    const profile = parsed.profile || parsed;
    return {
      displayName: typeof profile.name === 'string' ? profile.name : undefined,
      about: typeof profile.about === 'string' ? profile.about : undefined,
      profileImage: typeof profile.profile_image === 'string' ? profile.profile_image : undefined,
      website: typeof profile.website === 'string' ? profile.website : undefined,
      location: typeof profile.location === 'string' ? profile.location : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Get guaranteed avatar URL for a Hive user with CDN fallback
 */
export function getHiveAvatarUrl(username: string, customImage?: string): string {
  if (customImage && (customImage.startsWith('http://') || customImage.startsWith('https://'))) {
    return customImage;
  }
  return `https://images.hive.blog/u/${username.toLowerCase()}/avatar/large`;
}

/**
 * Format numbers with compact letters (K, M, B) or commas
 */
export function formatCompactNumber(num: number, decimals = 1): string {
  if (isNaN(num) || num === null || num === undefined) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
  return num.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

export function formatExactNumber(num: number, decimals = 2): string {
  if (isNaN(num) || num === null || num === undefined) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Relative time helper (e.g. "12m ago", "3h ago", "2d ago")
 */
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Never';
  const timestamp = new Date(dateString + 'Z').getTime();
  if (isNaN(timestamp)) return dateString;

  const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);
  if (secondsAgo < 60) return `${Math.max(1, secondsAgo)}s ago`;
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo}d ago`;
}
