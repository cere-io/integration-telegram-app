import { Text } from '@telegram-apps/telegram-ui';
import clsx from 'clsx';
import React, { useCallback, useState } from 'react';

import styles from './WalletAddressForm.module.css';

interface WalletFormProps {
  theme?: 'light' | 'dark';
  existedWalletAddress?: string;
  addressType?: string;
  userPublicKey?: string | null;
  network?: string;
  enable?: boolean;
}

// Comprehensive wallet address validation patterns for various blockchain networks
const addressPatterns = {
  // Ethereum and EVM-compatible chains
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  binance: /^0x[a-fA-F0-9]{40}$/, // BSC uses Ethereum format
  polygon: /^0x[a-fA-F0-9]{40}$/, // Polygon uses Ethereum format
  fantom: /^0x[a-fA-F0-9]{40}$/, // Fantom uses Ethereum format
  avalanche: /^0x[a-fA-F0-9]{40}$/, // Avalanche C-Chain uses Ethereum format
  optimism: /^0x[a-fA-F0-9]{40}$/, // Optimism uses Ethereum format
  arbitrum: /^0x[a-fA-F0-9]{40}$/, // Arbitrum uses Ethereum format

  // Bitcoin and derived chains
  bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
  litecoin: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,34}$/,
  dogecoin: /^D{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/,
  bitcoincash: /^[qp][a-zA-Z0-9]{41}$|^[13][a-km-zA-HJ-NP-Z1-9]{33}$/,

  // Other major blockchains
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  polkadot: /^[1-9A-HJ-NP-Za-km-z]{46,48}$/,
  kusama: /^[1-9A-HJ-NP-Za-km-z]{46,48}$/,
  cardano: /^addr1[a-zA-Z0-9]{98}$|^DdzFF[a-zA-Z0-9]{90,100}$/,
  ripple: /^r[0-9a-zA-Z]{24,34}$/,
  stellar: /^G[A-Z0-9]{55}$/,
  tezos: /^tz[1-3][a-zA-Z0-9]{33}$/,
  cosmos: /^cosmos[0-9a-z]{39}$/,
  algorand: /^[A-Z0-9]{58}$/,

  // Other networks
  near: /^[a-z0-9_-]{2,64}\.[a-z0-9_-]{2,64}$|^[a-f0-9]{64}$/,
  flow: /^0x[a-fA-F0-9]{16}$/,
  hedera: /^0\.0\.[0-9]{1,7}$/,
  elrond: /^erd1[a-zA-Z0-9]{58}$/,
  tron: /^T[a-zA-Z0-9]{33}$/,
  vechain: /^0x[a-fA-F0-9]{40}$/,
  theta: /^0x[a-fA-F0-9]{40}$/,
  filecoin: /^f[0-9]{1}[a-z0-9]{40,50}$/,

  // Avalanche (specific for X-chain)
  avalancheX: /^X-[a-zA-Z0-9]{39}$/,

  // Cosmos ecosystem
  osmosis: /^osmo[0-9a-z]{39}$/,
  juno: /^juno[0-9a-z]{39}$/,
  akash: /^akash[0-9a-z]{39}$/,
  secret: /^secret[0-9a-z]{39}$/,
  terra: /^terra[0-9a-z]{39}$/,
  stargaze: /^stars[0-9a-z]{39}$/,

  // Newer networks
  aptos: /^0x[a-fA-F0-9]{1,64}$/,
  sui: /^0x[a-fA-F0-9]{1,64}$/,
  ton: /^[UEQ][a-zA-Z0-9_-]{46}$/,
};

// Map of address types to their validation patterns
const addressTypePatterns: Record<string, RegExp> = {
  'EVM-compatible': /^0x[a-fA-F0-9]{40}$/,
  Substrate: /^[1-9A-HJ-NP-Za-km-z]{46,48}$/,
  Solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  Near: /^[a-z0-9_-]{2,64}\.[a-z0-9_-]{2,64}$|^[a-f0-9]{64}$/,
  Bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
  Other: /^[a-zA-Z0-9]{26,128}$/,
};

// Map network names to their corresponding pattern keys
const networkToPatternKey: Record<string, keyof typeof addressPatterns> = {
  // EVM-compatible networks
  'Ethereum Mainnet': 'ethereum',
  Polygon: 'polygon',
  'BNB Chain': 'binance',
  Avalanche: 'avalanche',
  Arbitrum: 'arbitrum',
  Optimism: 'optimism',
  Base: 'ethereum',
  Celo: 'ethereum',
  'Gnosis Chain': 'ethereum',
  'zkSync Era': 'ethereum',
  Linea: 'ethereum',
  Mantle: 'ethereum',
  Scroll: 'ethereum',
  Moonbeam: 'ethereum',

  // Substrate networks
  Polkadot: 'polkadot',
  Kusama: 'kusama',
  Astar: 'polkadot',
  Moonriver: 'polkadot',
  Acala: 'polkadot',
  Centrifuge: 'polkadot',
  HydraDX: 'polkadot',
  Interlay: 'polkadot',
  Phala: 'polkadot',
  Bifrost: 'polkadot',
};

const validateWalletAddress = (
  address: string,
  addressType?: string,
  network?: string,
): { isValid: boolean; network?: string } => {
  if (!address) return { isValid: false };

  // If we have a specific address type and/or network, prioritize that validation
  if (addressType) {
    // Use network-specific pattern if available
    if (network && network in networkToPatternKey) {
      const patternKey = networkToPatternKey[network];
      if (patternKey && addressPatterns[patternKey]?.test(address)) {
        return { isValid: true, network };
      }
    }

    // Fall back to address type pattern
    if (addressType in addressTypePatterns) {
      const typePattern = addressTypePatterns[addressType];
      if (typePattern && typePattern.test(address)) {
        return { isValid: true, network: network || addressType };
      }
    }

    // If specific validation fails but address type is selected, only validate against that type
    return { isValid: false };
  }

  // If no specific type/network, check against all patterns (original behavior)
  for (const [networkName, pattern] of Object.entries(addressPatterns)) {
    if (pattern.test(address)) {
      return { isValid: true, network: networkName };
    }
  }

  // If no specific pattern matches but address has reasonable length
  // and characters, consider it potentially valid
  if (/^[a-zA-Z0-9]{26,128}$/.test(address)) {
    return { isValid: true, network: 'unknown' };
  }

  return { isValid: false };
};

export const WalletAddressForm: React.FC<WalletFormProps> = ({
  theme = 'dark',
  existedWalletAddress = '',
  addressType,
  userPublicKey,
  network,
  enable,
}) => {
  const [walletAddress, setWalletAddress] = useState(existedWalletAddress);
  const [validation, setValidation] = useState<{ isValid: boolean; message: string; network?: string }>({
    isValid: true,
    message: '',
  });

  const getPlaceholderText = () => {
    if (!addressType) return 'Your wallet address';
    switch (addressType) {
      case 'EVM-compatible':
        return '0x...';
      case 'Substrate':
        return '5...';
      case 'Solana':
        return 'Solana address';
      case 'Near':
        return 'example.near';
      case 'Bitcoin':
        return 'bc1... or 1... or 3...';
      default:
        return 'Your wallet address';
    }
  };

  const handleWalletAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setWalletAddress(value);

      if (!value) {
        setValidation({ isValid: true, message: '' });
        return;
      }

      const result = validateWalletAddress(value.trim(), addressType, network);
      setValidation({
        isValid: result.isValid,
        network: result.network,
        message: result.isValid
          ? addressType
            ? `Valid ${network || addressType} address format`
            : result.network
              ? `Detected ${result.network} network address`
              : ''
          : addressType
            ? `Invalid ${network || addressType} wallet address format`
            : 'Invalid wallet address format',
      });
    },
    [addressType, network],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedAddress = walletAddress.trim();

      if (!trimmedAddress) {
        setValidation({ isValid: false, message: 'Wallet address is required' });
        return;
      }

      const result = validateWalletAddress(trimmedAddress, addressType, network);
      if (result.isValid) {
        window.parent.postMessage(
          {
            type: 'ATTACH_EXTERNAL_ADDRESS',
            walletAddress: trimmedAddress,
          },
          '*',
        );

        setValidation({ isValid: true, message: 'Address submitted successfully', network: result.network });
      } else {
        setValidation({
          isValid: false,
          message: addressType
            ? `Please enter a valid ${network || addressType} wallet address`
            : 'Please enter a valid wallet address',
        });
      }
    },
    [walletAddress, addressType, network],
  );

  if (!enable) return null;

  return (
    <div className={clsx(styles.container, styles[theme])}>
      <Text className={styles.text}>
        Enter your {network} wallet{addressType ? ` (${addressType})` : ''} address to get your rewards
      </Text>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={walletAddress}
            onChange={handleWalletAddressChange}
            placeholder={getPlaceholderText()}
            className={clsx(styles.input, {
              [styles.valid]: validation.isValid,
              [styles.invalid]: !validation.isValid,
            })}
          />
          <button
            type="submit"
            className={styles.button}
            disabled={!userPublicKey}
            style={{
              opacity: !userPublicKey ? 0.3 : 1,
              cursor: !userPublicKey ? 'not-allowed' : 'pointer',
            }}
          >
            {existedWalletAddress ? 'Edit' : 'Submit'}
          </button>
        </div>
        {(validation.message || validation.network) && (
          <div
            className={clsx(styles.validationMessage, {
              [styles.success]: validation.isValid,
              [styles.error]: !validation.isValid,
            })}
          >
            {validation.message}
            {validation.network && validation.isValid && (
              <span className={styles.networkBadge}>{validation.network}</span>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
