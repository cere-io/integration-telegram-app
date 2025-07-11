import './CustomWalletQuest.css';

import { ActivityEvent } from '@cere-activity-sdk/events';
import { useEvents, useStartParam } from '@integration-telegram-app/viewer/src/hooks';
import { useData } from '@integration-telegram-app/viewer/src/providers';
import { CustomTask, WalletCustomTask } from '@integration-telegram-app/viewer/src/types';
import { Badge, Card, IconButton, Section, Tooltip } from '@telegram-apps/telegram-ui';
import { Button, Input, Text, Title } from '@tg-app/ui';
import { CheckCircle, ClipboardList, Wallet, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CustomWalletQuestProps {
  quest: CustomTask;
  organizationId?: number;
  initialWallet?: string;
  disableAll?: boolean;
}

// Full validation logic
const addressPatterns = {
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  binance: /^0x[a-fA-F0-9]{40}$/,
  polygon: /^0x[a-fA-F0-9]{40}$/,
  avalanche: /^0x[a-fA-F0-9]{40}$/,
  arbitrum: /^0x[a-fA-F0-9]{40}$/,
  optimism: /^0x[a-fA-F0-9]{40}$/,
  fantom: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  polkadot: /^[1-9A-HJ-NP-Za-km-z]{46,48}$/,
  kusama: /^[1-9A-HJ-NP-Za-km-z]{46,48}$/,
  near: /^[a-z0-9_-]{2,64}\.[a-z0-9_-]{2,64}$|^[a-f0-9]{64}$/,
  bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
};

const addressTypePatterns: Record<string, RegExp> = {
  'EVM-compatible': /^0x[a-fA-F0-9]{40}$/,
  Substrate: /^[1-9A-HJ-NP-Za-km-z]{46,48}$/,
  Solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  Near: /^[a-z0-9_-]{2,64}\.[a-z0-9_-]{2,64}$|^[a-f0-9]{64}$/,
  Bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
  Other: /^[a-zA-Z0-9]{26,128}$/,
};

const networkToPatternKey = {
  'Ethereum Mainnet': 'ethereum',
  Polygon: 'polygon',
  'BNB Chain': 'binance',
  Avalanche: 'avalanche',
  Arbitrum: 'arbitrum',
  Optimism: 'optimism',
  Fantom: 'fantom',
  Polkadot: 'polkadot',
  Kusama: 'kusama',
  Solana: 'solana',
  Near: 'near',
  Bitcoin: 'bitcoin',
};

const resolveTypeFromPatternKey = (key: string): string => {
  if (['ethereum', 'binance', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'fantom'].includes(key))
    return 'EVM-compatible';
  if (['polkadot', 'kusama'].includes(key)) return 'Substrate';
  if (key === 'solana') return 'Solana';
  if (key === 'near') return 'Near';
  if (key === 'bitcoin') return 'Bitcoin';
  return 'Other';
};

const validateWalletAddress = (
  address: string,
  addressType?: string,
  network?: string,
): { valid: boolean; type?: string; network?: string; error?: string } => {
  if (!address) {
    return { valid: false, error: 'Address is empty' };
  }

  if (network && (networkToPatternKey as any)[network]) {
    const patternKey = (networkToPatternKey as any)[network];
    const pattern = (addressPatterns as any)[patternKey];
    if (!pattern.test(address)) {
      return {
        valid: false,
        error: `Address is invalid for required network: ${network}`,
      };
    }

    const resolvedType = resolveTypeFromPatternKey(patternKey);

    if (addressType && resolvedType !== addressType) {
      return {
        valid: false,
        error: `Expected address type "${addressType}", but got "${resolvedType}"`,
      };
    }

    return {
      valid: true,
      type: resolvedType,
      network,
    };
  }

  if (addressType && addressTypePatterns[addressType]) {
    const pattern = addressTypePatterns[addressType];
    if (!pattern.test(address)) {
      return {
        valid: false,
        error: `Address is not valid for address type: ${addressType}`,
      };
    }

    return {
      valid: true,
      type: addressType,
      network: network || addressType,
    };
  }

  for (const [net, pattern] of Object.entries(addressPatterns)) {
    if (pattern.test(address)) {
      return {
        valid: true,
        type: resolveTypeFromPatternKey(net),
        network: net,
      };
    }
  }

  if (/^[a-zA-Z0-9]{26,128}$/.test(address)) {
    return {
      valid: true,
      type: 'Other',
      network: 'unknown',
    };
  }

  return {
    valid: false,
    error: 'Invalid wallet address',
  };
};

function isWalletTask(task: any): task is WalletCustomTask {
  return task.subtype === 'wallet';
}

export const CustomWalletQuest = ({
  quest,
  organizationId,
  initialWallet,
  disableAll = false,
}: CustomWalletQuestProps) => {
  const [wallet, setWallet] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [walletType, setWalletType] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [selectedBlockchain, setSelectedBlockchain] = useState('EVM');

  const eventSource = useEvents();
  const { campaignId } = useStartParam();
  const { activeCampaignId, activeOrganizationId } = useData();

  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isWalletTask(quest)) {
      if (quest?.walletAddress) {
        setWallet(quest.walletAddress);
      }
    }
  }, [quest]);

  useEffect(() => {
    if (!wallet) {
      setError(null);
      setWalletType(null);
      setNetwork(null);
      return;
    }

    const result = validateWalletAddress(
      wallet,
      (quest as WalletCustomTask).walletType,
      (quest as WalletCustomTask).walletNetwork,
    );

    setWalletType(result.type || null);
    setNetwork(result.network || null);
    setError(result.error || null);

    if (result.valid && result.type) {
      const newSelected = result.type === 'Substrate' ? 'Cere SVM' : result.type;
      if (newSelected !== selectedBlockchain) {
        setSelectedBlockchain(newSelected);
      }
    }
  }, [wallet, quest, selectedBlockchain]);

  useEffect(() => {
    if (initialWallet) {
      setCompleted(true);
      const result = validateWalletAddress(
        initialWallet,
        (quest as WalletCustomTask).walletType,
        (quest as WalletCustomTask).walletNetwork,
      );
      setWalletType(result.type || null);
      setNetwork(result.network || null);
    }
  }, [initialWallet, quest]);

  const handleDetectClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setWallet(text);
      validate(text);
    } catch (err) {
      setError('Clipboard access denied');
    }
  };

  const validate = (value: string) => {
    const result = validateWalletAddress(value);
    if (!result.valid) {
      setError(result.error || 'Invalid wallet address');
      setWalletType(null);
      setNetwork(null);
    } else {
      setError(null);
      setWalletType(result.type || null);
      setNetwork(result.network || null);
    }
    return { valid: result.valid, type: result.type };
  };

  const handleSubmit = async () => {
    if (!validate(wallet as string).valid) return;
    if (!eventSource) return;

    const payload = {
      custom_quest: true,
      quest_id: quest.id,
      timestamp: new Date().toISOString(),
      campaign_id: campaignId || activeCampaignId,
      organization_id: organizationId || activeOrganizationId,
      walletAddress: wallet,
      completedEvent: quest.completedEvent,
      subtype: quest.subtype,
    };

    const activityEvent = new ActivityEvent(quest.startEvent, payload);

    await eventSource.dispatchEvent(activityEvent);
    setCompleted(true);
  };

  if (completed) {
    return (
      <div
        style={{
          border: '1px solid #eee',
          padding: '16px',
          borderRadius: 8,
          backgroundColor: '#f6fff6',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        <Title level="3" weight="2" style={{ marginBottom: 8 }}>
          ✅ Wallet Linked
        </Title>
        <Text>Your wallet is saved for this campaign.</Text>
      </div>
    );
  }

  return (
    <>
      <Card
        style={{
          width: '100%',
          opacity: disableAll ? 0.6 : 1,
          pointerEvents: disableAll ? 'none' : 'auto',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
          backgroundColor: '#f4f4f7',
          marginBottom: '16px',
        }}
      >
        <div style={{ padding: '24px' }}>
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 1,
            }}
          >
            {quest?.points && quest.points > 0 && (
              <div className="points">
                <Text as="span" style={{ whiteSpace: 'nowrap' }}>
                  {quest.points} Pts
                </Text>
              </div>
            )}
          </div>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet style={{ width: '24px', height: '24px', color: '#667eea' }} />
            </div>
            <Title level="1" style={{ color: '#1f2937', marginBottom: '8px' }}>
              Fill in your Wallet
            </Title>
            <Text style={{ color: '#6b7280', marginBottom: '12px' }}>
              The first step to participating in the campaign
            </Text>
            {!initialWallet && (
              <Badge mode={quest.completed ? 'secondary' : 'critical'} type="number">
                {quest.completed ? 'Completed' : 'Required'}
              </Badge>
            )}
          </div>

          {/* Blockchain Selection */}
          <Section
            header={
              <div style={{ margin: '8px 0' }}>
                <Text className="section-header-text" caps style={{ color: '#707579' }}>
                  Please enter a valid{' '}
                  {(quest as WalletCustomTask).walletNetwork || (quest as WalletCustomTask).walletType} wallet address
                </Text>
              </div>
            }
          ></Section>

          {/* Wallet Input */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <Input
                  header="Wallet address"
                  placeholder={
                    selectedBlockchain === 'EVM'
                      ? '0x1234567890abcdef1234567890abcdef'
                      : selectedBlockchain === 'Solana'
                        ? 'Enter Solana wallet address'
                        : 'Enter wallet address'
                  }
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  status={error ? 'error' : 'default'}
                  style={{
                    flex: 1,
                    ...(error && {
                      borderColor: '#ef4444',
                      backgroundColor: '#fef2f2',
                    }),
                    ...(wallet &&
                      !error && {
                        borderColor: '#10b981',
                        backgroundColor: '#f0fdf4',
                      }),
                  }}
                />
              </div>

              <>
                <div
                  ref={buttonRef}
                  style={{
                    display: 'inline-flex',
                  }}
                >
                  <IconButton
                    size="m"
                    mode="bezeled"
                    onClick={handleDetectClipboard}
                    style={{
                      padding: '0 12px',
                      minWidth: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ClipboardList size={16} />
                  </IconButton>
                </div>

                <Tooltip placement="bottom" hidden={true} mode="light" targetRef={buttonRef}>
                  Paste from clipboard
                </Tooltip>
              </>
            </div>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                <X style={{ width: '16px', height: '16px', color: '#ef4444' }} />
                <Text style={{ color: '#ef4444' }}>{error}</Text>
              </div>
            )}

            {!error && walletType && network && wallet !== (quest as WalletCustomTask).walletAddress && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981' }} />
                <Text style={{ color: '#10b981' }}>
                  The address is correct | Type: <strong>{walletType}</strong> | Network: <strong>{network}</strong>
                </Text>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            mode="cta"
            size="l"
            onClick={handleSubmit}
            disabled={!wallet || !!error || disableAll || wallet === (quest as WalletCustomTask).walletAddress}
            style={{
              width: '100%',
              marginTop: '6px',
              ...(wallet &&
                !error && {
                  backgroundColor: '#10b981',
                  color: 'white',
                }),
            }}
          >
            {(quest as WalletCustomTask).walletAddress ? 'Change wallet address' : 'Confirm wallet'}
          </Button>
        </div>
      </Card>
    </>
  );
};
