import { ActivityEvent } from '@cere-activity-sdk/events';
import { useCereWallet } from '@integration-telegram-app/viewer/src/cere-wallet';
import { X_CLIENT_ID } from '@integration-telegram-app/viewer/src/constants.ts';
import { useEvents } from '@integration-telegram-app/viewer/src/hooks';
import { useData } from '@integration-telegram-app/viewer/src/providers';
import { CustomTask } from '@integration-telegram-app/viewer/src/types';
import { Spinner, Text } from '@telegram-apps/telegram-ui';
import { Snackbar } from '@tg-app/ui';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface XConnectQuestProps {
  quest: CustomTask;
  remainingDays: number;
  accountId?: string;
  campaignId?: number;
  organizationId?: number;
  isDisabled?: boolean;
}

export const XConnectQuest: React.FC<XConnectQuestProps> = ({
  quest,
  remainingDays,
  accountId,
  campaignId,
  organizationId,
  isDisabled = false,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const cereWallet = useCereWallet();
  const { activeCampaignId, activeOrganizationId } = useData();
  const eventSource = useEvents();

  const generateWalletToken = useCallback(async () => {
    if (!cereWallet) return null;

    try {
      const signer = cereWallet.getSigner({ type: 'ed25519' });
      const account = await signer.getAccount();
      const publicKey = account.publicKey;
      const userInfo = await cereWallet.getUserInfo();

      if (!publicKey) {
        throw new Error('Failed to get public key from wallet');
      }

      const now = Date.now();
      const expirationTime = now + 15 * 60 * 1000; // 15 minutes

      const tokenData = {
        header: {
          alg: 'ed25519',
          typ: 'JWT',
        },
        payload: {
          email: userInfo.email,
          publicKey: publicKey,
          iat: now,
          exp: expirationTime,
        },
        signature: '', // Will be filled after signing
      };

      // Create the string to sign (base64 encoded header and payload)
      const headerStr = btoa(JSON.stringify(tokenData.header));
      const payloadStr = btoa(JSON.stringify(tokenData.payload));
      const dataToSign = `${headerStr}.${payloadStr}`;

      // Sign the data
      const signature = await signer.signMessage(dataToSign);

      // Create the complete token
      const token = `${dataToSign}.${signature}`;

      return token;
    } catch (error) {
      console.error('Failed to generate wallet token:', error);
      return null;
    }
  }, [cereWallet]);

  const checkXConnection = useCallback(async () => {
    if (!cereWallet || !accountId) return;

    try {
      setIsCheckingConnection(true);
      setErrorMessage(null);

      const token = await generateWalletToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Use the correct API URL
      const response = await fetch(`https://api.wallet.stage.cere.io/auth/x/data?token=${encodeURIComponent(token)}`);

      if (response.status === 200) {
        // X is connected
        setConnectionStatus('connected');
        setIsConnecting(false);

        // Send X_CONNECTED event
        if (eventSource) {
          const activityEventPayload = {
            quest_id: quest.id,
            custom_quest: true,
            timestamp: new Date().toISOString(),
            organization_id: organizationId || activeOrganizationId,
            campaign_id: campaignId || activeCampaignId,
            campaignId: campaignId || activeCampaignId,
          };
          const activityEvent = new ActivityEvent(quest.completedEvent.toUpperCase(), activityEventPayload);
          await eventSource.dispatchEvent(activityEvent);
        }

        setSnackbarMessage('X account connected successfully!');
      } else if (response.status === 404) {
        // X is not connected yet
        setConnectionStatus('connecting');
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    } catch (error) {
      console.error('Error checking X connection:', error);
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to check X connection');
      setIsConnecting(false);
    } finally {
      setIsCheckingConnection(false);
    }
  }, [
    cereWallet,
    accountId,
    eventSource,
    quest,
    organizationId,
    activeOrganizationId,
    campaignId,
    activeCampaignId,
    generateWalletToken,
  ]);

  // Check if X is already connected on component mount
  useEffect(() => {
    if (quest.subtype === 'x_connect' && !quest.completed && accountId) {
      checkXConnection();
    }
  }, [quest, accountId, checkXConnection]);

  // Polling for connection status when connecting
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isConnecting && connectionStatus === 'connecting') {
      interval = setInterval(() => {
        checkXConnection();
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnecting, connectionStatus, checkXConnection]);

  const handleXConnect = useCallback(async () => {
    if (!cereWallet || isDisabled) return;

    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');
      setErrorMessage(null);

      const account = await cereWallet.getSigner({ type: 'ed25519' }).getAccount();
      const publicKey = account.publicKey;
      const signer = cereWallet.getSigner({ type: 'ed25519' });

      // Create JWT header
      const header = {
        alg: 'ed25519',
        typ: 'JWT',
      };

      // Create JWT payload
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        publicKey: publicKey,
        iat: now,
        exp: now + 600, // 10 minutes expiration
      };

      // Base64URL encode header and payload
      const headerEncoded = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const payloadEncoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      // Sign header.payload with wallet's private key
      const message = `${headerEncoded}.${payloadEncoded}`;
      const signatureText = await signer.signMessage(message);

      // Base64URL encode signature
      const signatureEncoded = btoa(signatureText).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      // Construct final JWT token
      const jwtToken = `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;

      // Create OAuth URL with JWT token as state
      const oauthUrl = 'https://twitter.com/i/oauth2/authorize';
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: X_CLIENT_ID,
        redirect_uri: 'https://api.wallet.stage.cere.io/auth/x/oauth/callback', // Use staging redirect URI
        scope: 'tweet.read users.read offline.access',
        state: jwtToken,
        code_challenge: 'challenge_' + Math.random().toString(36).substring(2, 15),
        code_challenge_method: 'S256',
      });

      window.open(`${oauthUrl}?${params.toString()}`, '_blank');
    } catch (error) {
      console.error('Error initiating X connection:', error);
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to initiate X connection');
      setIsConnecting(false);
    }
  }, [cereWallet, isDisabled]);

  const TwitterIcon = () => (
    <div className="iconBase">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 450 450" fill="none">
        <g transform="translate(50, 0)">
          <path
            d="M178.57 127.15L290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66"
            fill="currentColor"
          />
        </g>
      </svg>
    </div>
  );

  const getStatusContent = () => {
    if (isCheckingConnection) {
      return (
        <div className="status-overlay">
          <div className="status-content">
            <Spinner size="m" />
            <Text className="status-text">Checking X connection...</Text>
          </div>
        </div>
      );
    }

    switch (connectionStatus) {
      case 'connecting':
        return (
          <div className="status-overlay">
            <div className="status-content">
              <Spinner size="m" />
              <Text className="status-text">Waiting for X connection...</Text>
            </div>
          </div>
        );
      case 'connected':
        return (
          <div className="status-overlay success">
            <div className="status-content">
              <CheckCircle className="h-6 w-6 text-white" />
              <Text className="status-text">X connected!</Text>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="status-overlay error">
            <div className="status-content">
              <AlertCircle className="h-6 w-6 text-white" />
              <Text className="status-text">{errorMessage || 'Connection failed'}</Text>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="questCard">
      {quest?.completed && <div className="overlay" />}

      <div className="questThumbnailBlock">
        {quest?.questImage ? (
          <img className="questThumbnail" src={quest.questImage} alt={quest.title} />
        ) : (
          <TwitterIcon />
        )}
        <div className="pointsBlock">
          {quest?.points && quest.points > 0 && (
            <div className="points">
              <Text as="span" style={{ whiteSpace: 'nowrap' }}>
                {quest.points} Pts
              </Text>
            </div>
          )}
        </div>
        {getStatusContent()}
      </div>

      <div className="questContent">
        <div className="questInfo">
          <div className="textContent">
            <Text weight="1" className="questTitle">
              {quest.title}
            </Text>
            <Text className="questDescription">{quest.description}</Text>

            <div className="questFooter">
              <Text className="timeRemaining">{remainingDays}d remaining</Text>
              <div className="questActions">
                {quest.completed && <Text style={{ color: '#0ee640' }}>Completed</Text>}

                {!quest.completed && (
                  <button
                    className="startButton"
                    disabled={isDisabled || isConnecting || isCheckingConnection}
                    onClick={handleXConnect}
                  >
                    {isConnecting || isCheckingConnection ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {isCheckingConnection ? 'Checking...' : 'Connecting...'}
                      </>
                    ) : (
                      'Connect X Account →'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {connectionStatus === 'connecting' && (
        <div className="instructions">
          <Text className="instructionsTitle">Instructions: </Text>
          <Text className="instructionsText">✅ Close the X tab when you're done.</Text>
        </div>
      )}

      {quest.instructions && connectionStatus !== 'connecting' && (
        <div className="instructions">
          <Text className="instructionsTitle">Instructions: </Text>
          <Text className="instructionsText">{quest.instructions}</Text>
          <button
            className="button"
            onClick={handleXConnect}
            disabled={isDisabled || isConnecting || isCheckingConnection}
          >
            {isConnecting || isCheckingConnection ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isCheckingConnection ? 'Checking...' : 'Connecting...'}
              </>
            ) : (
              'Connect X Account'
            )}
          </button>
        </div>
      )}

      {snackbarMessage && (
        <Snackbar style={{ zIndex: 99999 }} onClose={() => setSnackbarMessage(null)} duration={5000}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text>{snackbarMessage}</Text>
          </div>
        </Snackbar>
      )}
    </div>
  );
};
