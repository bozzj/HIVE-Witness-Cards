import { KeychainVoteResponse } from '../types/hive';

declare global {
  interface Window {
    hive_keychain?: {
      requestHandshake: (callback: () => void) => void;
      requestWitnessVote: (
        username: string,
        witness: string,
        approve: boolean,
        callback: (response: KeychainVoteResponse) => void
      ) => void;
      requestSignBuffer: (
        username: string,
        message: string,
        role: string,
        callback: (response: { success: boolean; result?: any; message?: string; error?: string }) => void
      ) => void;
    };
  }
}

/**
 * Checks whether Hive Keychain browser extension is present.
 */
export function isKeychainAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.hive_keychain);
}

/**
 * Submit a witness vote/unvote request via Hive Keychain.
 */
export function voteWitnessKeychain(
  username: string,
  witness: string,
  approve: boolean
): Promise<KeychainVoteResponse> {
  return new Promise((resolve) => {
    if (!window.hive_keychain) {
      resolve({
        success: false,
        error: 'Hive Keychain extension is not installed or not detected in this browser.',
      });
      return;
    }

    try {
      window.hive_keychain.requestWitnessVote(
        username.trim().toLowerCase(),
        witness.trim().toLowerCase(),
        approve,
        (response) => {
          if (response) {
            resolve(response);
          } else {
            resolve({
              success: false,
              error: 'No response received from Hive Keychain.',
            });
          }
        }
      );
    } catch (err: any) {
      resolve({
        success: false,
        error: err?.message || 'Error communicating with Hive Keychain.',
      });
    }
  });
}

/**
 * Generates a HiveSigner URL for users without Keychain or on mobile.
 */
export function getHiveSignerVoteUrl(witness: string, approve: boolean): string {
  const cleanWitness = witness.trim().toLowerCase();
  return `https://hivesigner.com/sign/account-witness-vote?witness=${encodeURIComponent(cleanWitness)}&approve=${approve}`;
}
