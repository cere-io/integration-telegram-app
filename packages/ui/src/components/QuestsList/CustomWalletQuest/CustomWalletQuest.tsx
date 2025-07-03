import './CustomWalletQuest.css';

import { ActivityEvent } from '@cere-activity-sdk/events';
import { useEvents, useStartParam } from '@integration-telegram-app/viewer/src/hooks';
import { useData } from '@integration-telegram-app/viewer/src/providers';
import { CustomTask } from '@integration-telegram-app/viewer/src/types';
import { Badge, Banner, Card, IconButton, Section, Tooltip } from '@telegram-apps/telegram-ui';
import {
  Button,
  Input,
  isEthereumAddress,
  isValidPolkadotAddress,
  isValidSolanaAddress,
  Text,
  Title,
} from '@tg-app/ui';
import { CheckCircle, ClipboardList, Wallet, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CustomWalletQuestProps {
  quest: CustomTask;
  initialWallet?: string;
  disableAll?: boolean;
}

function detectNetwork(address: string): string | null {
  if (isEthereumAddress(address)) return 'EVM';
  if (isValidSolanaAddress(address)) return 'Solana';
  if (isValidPolkadotAddress(address)) return 'Cere';
  return null;
}

export function validateWalletAddress(address: string): { valid: boolean; type?: string; error?: string } {
  if (isEthereumAddress(address)) return { valid: true, type: 'evm' };
  if (isValidSolanaAddress(address)) return { valid: true, type: 'solana' };
  if (isValidPolkadotAddress(address)) return { valid: true, type: 'cere' };
  return { valid: false, error: 'Invalid wallet address (must be EVM, Solana, or Cere)' };
}

export const CustomWalletQuest = ({ quest, initialWallet, disableAll = false }: CustomWalletQuestProps) => {
  const [wallet, setWallet] = useState(quest?.walletAddress || '');
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
    if (wallet) {
      const result = validateWalletAddress(wallet);
      setWalletType(result.type || null);
      setNetwork(detectNetwork(wallet));
      if (result.valid && result.type) {
        let newSelected = '';
        switch (result.type) {
          case 'evm':
            newSelected = 'EVM';
            break;
          case 'solana':
            newSelected = 'Solana';
            break;
          case 'cere':
            newSelected = 'Cere SVM';
            break;
        }
        if (newSelected && newSelected !== selectedBlockchain) {
          setSelectedBlockchain(newSelected);
        }
      }
    } else {
      setWalletType(null);
      setNetwork(null);
      setSelectedBlockchain('EVM');
    }
  }, [selectedBlockchain, wallet]);

  useEffect(() => {
    if (initialWallet) {
      setCompleted(true);
      const validation = validateWalletAddress(initialWallet);
      setWalletType(validation.type || null);
      setNetwork(detectNetwork(initialWallet));
    }
  }, [initialWallet]);

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
      setNetwork(detectNetwork(value));
    }
    return { valid: result.valid, type: result.type };
  };

  const handleSubmit = async () => {
    if (!validate(wallet)) return;
    if (!eventSource) return;

    const payload = {
      custom_quest: true,
      quest_id: quest.id,
      timestamp: new Date().toISOString(),
      campaign_id: campaignId || activeCampaignId,
      organization_id: activeOrganizationId,
      walletAddress: wallet,
      completedEvent: quest.completedEvent,
    };

    console.log({ quest });

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
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
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

          {/* Warning Banner */}
          <Banner
            header="⚠️ Attention!"
            subheader="This quest must be completed first. Without a connected wallet, you cannot continue."
          />

          {/* Blockchain Selection */}
          <Section
            header={
              <div style={{ margin: '8px 0' }}>
                <Text className="section-header-text" caps>
                  Choose a blockchain
                </Text>
              </div>
            }
          >
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {['EVM', 'Solana', 'Cere SVM'].map((blockchain) => (
                <Button
                  key={blockchain}
                  mode={selectedBlockchain === blockchain ? 'filled' : 'bezeled'}
                  size="s"
                  onClick={() => setSelectedBlockchain(blockchain)}
                  style={{ flex: 1 }}
                >
                  {blockchain === 'EVM' ? 'EVM (0x...)' : blockchain}
                </Button>
              ))}
            </div>
          </Section>

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

            {!error && walletType && network && (
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
            disabled={!wallet || !!error || disableAll}
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
            {quest.walletAddress ? 'Change wallet address' : 'Confirm wallet'}
          </Button>
        </div>
      </Card>
    </>
  );
};
