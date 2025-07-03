import { hexToU8a, isHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { PublicKey } from '@solana/web3.js';
import { isAddress } from 'ethers';

export function isValidPolkadotAddress(address: string): boolean {
  try {
    encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address));
    return true;
  } catch {
    return false;
  }
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return PublicKey.isOnCurve(new PublicKey(address));
  } catch {
    return false;
  }
}

export function isEthereumAddress(address: string): boolean {
  return isAddress(address);
}
