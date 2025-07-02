// import './WalletQuest.css';

import { useCereWallet } from '@integration-telegram-app/viewer/src/cere-wallet';
import { Text } from '@telegram-apps/telegram-ui';
import { WalletQuestData } from '@tg-app/api';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '../Button';
import { Snackbar } from '../Snackbar';

// Extend Window interface for MetaMask ethereum object
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      selectedAddress?: string;
    };
  }
}

interface WalletQuestProps {
  quest: WalletQuestData;
  onComplete: (address: string, chainType: string) => void;
  disabled?: boolean;
}

type ChainType = 'evm' | 'solana' | 'cere_svm';

const CHAIN_PATTERNS = {
  evm: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[A-HJ-NP-Z1-9]{32,44}$/,
  cere_svm: /^[A-HJ-NP-Z1-9]{32,44}$/,
};

const CHAIN_NAMES = {
  evm: 'EVM (Ethereum, BSC, Polygon, etc.)',
  solana: 'Solana',
  cere_svm: 'Cere SVM',
};

export const WalletQuest: React.FC<WalletQuestProps> = ({ quest, onComplete, disabled = false }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState<ChainType>('evm');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnectOptions, setShowConnectOptions] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const cereWallet = useCereWallet();

  // Auto-detect clipboard content on component mount
  useEffect(() => {
    const detectClipboardAddress = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const clipboardText = await navigator.clipboard.readText();

          const trimmedText = clipboardText.trim();

          // Check if clipboard contains a valid wallet address
          for (const [chainType, pattern] of Object.entries(CHAIN_PATTERNS)) {
            if (pattern.test(trimmedText)) {
              setWalletAddress(trimmedText);
              setSelectedChain(chainType as ChainType);
              setSnackbarMessage(`Detected ${CHAIN_NAMES[chainType as ChainType]} address from clipboard`);
              break;
            }
          }
        }
      } catch (error) {
        // Clipboard access failed - this is normal on some browsers/contexts
        console.log('Clipboard access not available');
      }
    };

    detectClipboardAddress();
  }, []);

  const validateAddress = useCallback((address: string, chainType: ChainType): boolean => {
    const pattern = CHAIN_PATTERNS[chainType];
    return pattern.test(address);
  }, []);

  const handleAddressChange = (value: string) => {
    setWalletAddress(value);
    setError(null);
  };

  const handleChainChange = (chainType: ChainType) => {
    setSelectedChain(chainType);
    setError(null);

    // Re-validate current address with new chain
    if (walletAddress && !validateAddress(walletAddress, chainType)) {
      setError(`Invalid ${CHAIN_NAMES[chainType]} address format`);
    }
  };

  const handleConnectCereWallet = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!cereWallet) {
        throw new Error('Cere Wallet not initialized');
      }

      await cereWallet.connect();
      const signer = cereWallet.getSigner({ type: 'ed25519' });
      const address = await signer.getAddress();

      setWalletAddress(address);
      setSelectedChain('cere_svm');
      setSnackbarMessage('Successfully connected Cere Wallet');
    } catch (error) {
      console.error('Failed to connect Cere Wallet:', error);
      setError('Failed to connect Cere Wallet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWalletConnect = () => {
    // For MetaMask and other external wallets
    if (window.ethereum) {
      window.ethereum
        .request({ method: 'eth_requestAccounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setSelectedChain('evm');
            setSnackbarMessage('Successfully connected MetaMask');
          }
        })
        .catch((error: Error) => {
          setError('Failed to connect external wallet');
          console.error('External wallet connection failed:', error);
        });
    } else {
      setError('No external wallet detected. Please install MetaMask or use manual address input.');
    }
  };

  const handleSubmit = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    if (!validateAddress(walletAddress, selectedChain)) {
      setError(`Invalid ${CHAIN_NAMES[selectedChain]} address format`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Here you would call the API to submit the wallet address
      // await botApi.submitWalletAddress(walletAddress, selectedChain, campaignId);

      onComplete(walletAddress, selectedChain);
      setSnackbarMessage('Wallet successfully linked!');
    } catch (error) {
      console.error('Failed to submit wallet address:', error);
      setError('Failed to link wallet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="wallet-quest">
      <div className="wallet-quest-header">
        <div className="quest-icon mandatory-icon">🔒</div>
        <div className="quest-content">
          <Text className="quest-title">{quest.title}</Text>
          <Text className="quest-description">{quest.description}</Text>
          <Text className="mandatory-text">Required to continue</Text>
        </div>
        <div className="quest-points">+{quest.points}</div>
      </div>

      {!quest.completed && (
        <div className="wallet-quest-body">
          {!showConnectOptions ? (
            <div className="wallet-input-section">
              <div className="chain-selector">
                <Text className="label">Select blockchain:</Text>
                <div className="chain-options">
                  {quest.supported_chains.map((chain) => (
                    <button
                      key={chain}
                      className={`chain-option ${selectedChain === chain ? 'selected' : ''}`}
                      onClick={() => handleChainChange(chain)}
                      disabled={disabled}
                    >
                      {CHAIN_NAMES[chain]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="address-input-section">
                <Text className="label">Wallet address:</Text>
                <textarea
                  className="address-input"
                  value={walletAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder={`Enter your ${CHAIN_NAMES[selectedChain]} address...`}
                  disabled={disabled || isSubmitting}
                  rows={2}
                />
              </div>

              {error && <Text className="error-text">{error}</Text>}

              <div className="wallet-actions">
                <Button mode="cta" onClick={handleSubmit} disabled={disabled || isSubmitting || !walletAddress.trim()}>
                  {isSubmitting ? 'Linking...' : 'Link Wallet'}
                </Button>

                <Button mode="link" onClick={() => setShowConnectOptions(true)} disabled={disabled || isSubmitting}>
                  Or connect wallet
                </Button>
              </div>
            </div>
          ) : (
            <div className="connect-options">
              <Text className="connect-title">Connect your wallet:</Text>

              <div className="connect-buttons">
                <Button
                  onClick={handleConnectCereWallet}
                  disabled={disabled || isSubmitting}
                  className="connect-option"
                >
                  {isSubmitting ? 'Connecting...' : 'Cere Wallet'}
                </Button>

                <Button onClick={handleWalletConnect} disabled={disabled || isSubmitting} className="connect-option">
                  MetaMask / External
                </Button>

                <Button mode="link" onClick={() => setShowConnectOptions(false)} disabled={disabled || isSubmitting}>
                  Enter manually
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {quest.completed && (
        <div className="quest-completed">
          <Text className="completed-text">✅ Wallet linked successfully</Text>
        </div>
      )}

      {snackbarMessage && (
        <Snackbar onClose={() => setSnackbarMessage(null)} duration={5000}>
          <Text>{snackbarMessage}</Text>
        </Snackbar>
      )}
    </div>
  );
};
