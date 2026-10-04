export interface WitnessProps {
  account_creation_fee: string;
  maximum_block_size: number;
  hbd_interest_rate: number; // in basis points (e.g., 2000 = 20.00%)
  account_subsidy_budget?: number;
  account_subsidy_decay?: number;
}

export interface ExchangeRate {
  base: string; // e.g. "0.057 HBD"
  quote: string; // e.g. "1.000 HIVE"
}

export interface RawWitness {
  id: number;
  owner: string;
  created: string;
  url: string;
  votes: string; // VESTS in microvests
  virtual_last_update: string;
  virtual_position: string;
  virtual_scheduled_time: string;
  total_missed: number;
  last_aslot: number;
  last_confirmed_block_num: number;
  pow_worker: number;
  signing_key: string;
  props: WitnessProps;
  hbd_exchange_rate?: ExchangeRate;
  sbd_exchange_rate?: ExchangeRate;
  last_hbd_exchange_update?: string;
  last_sbd_exchange_update?: string;
  last_work?: string;
  running_version: string;
  hardfork_version_vote: string;
  hardfork_time_vote: string;
  available_witness_account_subsidies?: number;
}

export interface WitnessAccountDetails {
  name: string;
  balance: string; // "123.456 HIVE"
  hbd_balance: string; // "78.900 HBD"
  savings_balance: string;
  savings_hbd_balance: string;
  vesting_shares: string; // "12345678.90 VESTS"
  delegated_vesting_shares: string;
  received_vesting_shares: string;
  vesting_withdraw_rate: string;
  to_withdraw: string | number;
  withdrawn: string | number;
  next_vesting_withdrawal: string;
  witness_votes: string[];
  proxy?: string;
  voting_manabar?: {
    current_mana: string | number;
    last_update_time: number;
  };
  posting_json_metadata?: string;
  json_metadata?: string;
}

export interface DynamicGlobalProperties {
  head_block_number: number;
  head_block_id: string;
  time: string;
  current_witness: string;
  total_vesting_fund_hive: string; // "216698724.637 HIVE"
  total_vesting_shares: string; // "348451861549.620240 VESTS"
  hbd_interest_rate: number;
  current_supply: string;
  current_hbd_supply: string;
  hbd_print_rate: number;
}

export interface WitnessCardData extends RawWitness {
  rank: number;
  isTop20: boolean;
  isActive: boolean; // signing_key !== 'STM1111111111111111111111111111111114T1Anm'
  hbdInterestPercent: number; // e.g. 20.0
  voteHP: number; // Votes calculated in Hive Power
  voteWeightPct: number; // Percent of total active witness vote weight
  exchangeRateText: string;
  lastFeedUpdateText: string;
  accountDetails?: WitnessAccountDetails;
  hivePower?: number; // Witness's personal Hive Power
  delegatedHP?: number;
  receivedHP?: number;
  displayName?: string;
  aboutText?: string;
  profileImageUrl?: string;
}

export interface KeychainVoteResponse {
  success: boolean;
  result?: any;
  message?: string;
  error?: string;
}

export type FilterCategory = 'all' | 'top20' | 'backup' | 'standby' | 'voted' | 'active';
export type SortOption = 'rank' | 'hbd_rate_desc' | 'hp_desc' | 'missed_asc' | 'votes_desc';
