import './QuestsListItem.css';

import { ActivityEvent } from '@cere-activity-sdk/events';
import { ActiveTab } from '@integration-telegram-app/viewer/src/App.tsx';
import { useCereWallet } from '@integration-telegram-app/viewer/src/cere-wallet';
import { TELEGRAM_APP_URL, X_CLIENT_ID, X_REDIRECT_URI } from '@integration-telegram-app/viewer/src/constants.ts';
import { useEvents } from '@integration-telegram-app/viewer/src/hooks';
import { useData } from '@integration-telegram-app/viewer/src/providers';
import { CustomTask, ReferralTask, Task, VideoTask } from '@integration-telegram-app/viewer/src/types';
import { Text } from '@telegram-apps/telegram-ui';
import { Snackbar } from '@tg-app/ui';
import { sha256, toUtf8Bytes } from 'ethers';
import { ClipboardCheck } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import Picture from './assets/refer_a_friend.png';
import { CustomWalletQuest } from './CustomWalletQuest';
import { QuizQuest } from './QuizQuest';
import { RepostButton } from './RepostButton';
import { XConnectQuest } from './XConnectQuest';

// Type guard functions
function isXConnectCustomTask(
  task: any,
): task is { subtype: 'x_connect'; instructions?: string; questImage?: string; title?: string } {
  return task && task.subtype === 'x_connect';
}

function isDefaultCustomTask(
  task: any,
): task is { subtype?: 'default'; instructions?: string; link?: string; questImage?: string; title?: string } {
  return !task.subtype || task.subtype === 'default';
}

function isArrayOfInvitees(val: string[] | number): val is string[] {
  if (!val) return false;
  return Array.isArray(val);
}

const CustomLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
};

function formatText(text: string) {
  return (
    <Markdown
      options={{
        overrides: {
          a: {
            component: CustomLink,
          },
        },
      }}
    >
      {text}
    </Markdown>
  );
}

export type QuestsListItemProps = {
  quest: Task;
  remainingDays: number;
  organizationId: number;
  setActiveTab: (tab: ActiveTab) => void;
  accountId?: string;
  campaignId?: number;
  shouldLockOthers?: boolean;
};

export const QuestsListItem: React.FC<QuestsListItemProps> = forwardRef<HTMLDivElement, QuestsListItemProps>(
  ({ quest, accountId, campaignId, organizationId, shouldLockOthers, remainingDays, setActiveTab }, ref) => {
    const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
    const isMandatory = quest.type === 'custom' && quest.is_mandatory === true;
    const isLocked = shouldLockOthers && !isMandatory;

    const cereWallet = useCereWallet();
    const { activeCampaignId, activeOrganizationId } = useData();
    const eventSource = useEvents();

    const lockedStyle: React.CSSProperties = isLocked
      ? {
          pointerEvents: 'none',
          opacity: 0.5,
          userSelect: 'none',
          zIndex: 10,
        }
      : {};

    const handleClick = async () => {
      if (isLocked) return;
      if (quest.type === 'dex') {
        handleOnDexClick();
      } else if (quest.type === 'video') {
        handleOnQuestClick(quest.videoUrl);
      } else if (quest.type === 'custom') {
        if (!eventSource) return;

        const activityEventPayload = {
          quest_id: quest.id,
          custom_quest: true,
          timestamp: new Date().toISOString(),
          organization_id: organizationId || activeOrganizationId,
          campaign_id: campaignId || activeCampaignId,
          campaignId: campaignId || activeCampaignId,
        };
        const activityEvent = new ActivityEvent(quest.startEvent, activityEventPayload);

        await eventSource.dispatchEvent(activityEvent);

        if (quest.subtype === 'x_connect') {
          handleOnXConnectClick();
        } else if (quest.link) {
          window.open(
            `${quest.link}&organization_id=${organizationId || activeOrganizationId}&campaign_id=${campaignId || activeCampaignId}&quest_id=${quest.id}`,
            '_blank',
          );
        }
      } else {
        handleOnReferralLinkClick();
      }
    };

    const handleOnDexClick = useCallback(() => {
      if (quest.type === 'dex') {
        window.open(quest.tradingLink, '_blank');
      }
    }, [quest]);

    const handleOnQuestClick = (videoUrl: string | undefined) => {
      if (isLocked) return;
      if (videoUrl && videoUrl !== '') {
        setActiveTab({
          index: 2,
          props: {
            videoUrl,
          },
        });
      }
    };

    const getReferralProgramMessage = useCallback(async () => {
      if (!cereWallet) return;
      const accountId = await cereWallet.getSigner({ type: 'ed25519' }).getAddress();
      const invitationLink = `${TELEGRAM_APP_URL}?startapp=${campaignId}_${accountId}`;

      const messageText: string = (quest as ReferralTask).message || '';
      const decodedText = messageText.replace(/\\u[0-9A-Fa-f]{4,}/g, (match) =>
        String.fromCodePoint(parseInt(match.replace('\\u', ''), 16)),
      );
      return decodedText.replace('{link}', invitationLink);
    }, [campaignId, cereWallet, quest]);

    const handleOnReferralButtonClick = useCallback(async () => {
      const message = await getReferralProgramMessage();
      if (!message) return;
      window.open(`https://t.me/share/url?url=${encodeURIComponent(message)}`);
      return;
    }, [getReferralProgramMessage]);

    const handleOnReferralLinkClick = useCallback(async () => {
      const message = await getReferralProgramMessage();
      if (!message) return;
      // Copy a referral message to clipboard
      try {
        const tempInput = document.createElement('textarea');
        tempInput.value = message;
        document.body.appendChild(tempInput);
        tempInput.select();
        if (document.execCommand('copy')) {
          setSnackbarMessage('Invitation copied to clipboard successfully!');
        } else {
          setSnackbarMessage('Failed to copy the invitation.');
        }
        document.body.removeChild(tempInput);
      } catch (e) {
        console.error('Failed to copy a referral message:', e);
        setSnackbarMessage(`Clipboard is not supported.`);
      }
    }, [getReferralProgramMessage]);

    const handleOnXConnectClick = useCallback(async () => {
      if (quest.type !== 'custom' || quest.subtype !== 'x_connect') return;
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
        publicKey: `0x${publicKey}`,
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
        redirect_uri: X_REDIRECT_URI,
        scope: 'tweet.read users.read offline.access',
        state: jwtToken,
        code_challenge: sha256(toUtf8Bytes('temporary_code_verifier')),
        code_challenge_method: 'S256',
      });
      window.open(`${oauthUrl}?${params.toString()}`, '_blank');
    }, [quest, cereWallet]);

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

    const DexIcon = () => (
      <div className="iconBase">
        <svg width="24" height="24" viewBox="0 0 126 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M63 59.3V59.3C65.4 50.2 70.1 41.6 76.3 33.9C72.2 14.3 63.1 0.1 63 0V0L63 0L63 0V0C62.9 0.1 53.8 14.3 49.7 33.9C55.9 41.6 60.6 50.2 63 59.3V59.3L63 59.3Z"
            fill="#111113"
          />
          <path
            d="M14.3 117.7C12.6 125.4 11.6 132 10.8 139.6C19.1 138.1 32.3 134 44.4 120.6C56.5 107.2 60 90.1 60 81.1C60 72.1 59.6 54 43.2 36.6C31.7 24.4 18.7 20.5 11.8 19C24.6 29.5 32 41.4 35.7 57.4C24.2 49.2 9.5 48.4 0.1 51.4C8.1 55.2 14.2 59.5 20.4 66.2C25.5 71.8 29.9 78 33.5 87.7C25.5 90.4 20.9 95.8 18.7 102.2C16.5 108.5 14.3 117.7 14.3 117.7Z"
            fill="#111113"
          />
          <path
            d="M59.9 200C59.3 184.2 52.6 170.9 43.1 161.3C34.7 152.8 22.9 146.9 10.3 145.3C9.8 153.8 10 160.4 10.6 168.6C11.1 176.9 13.4 182.7 18.6 188.5C23.9 194.4 29.6 196.2 33.4 197.3C37.3 198.3 53.5 200.3 59.9 200Z"
            fill="#111113"
          />
          <path
            d="M111.7 117.7C113.4 125.4 114.4 132 115.2 139.6C106.9 138.1 93.7 134 81.6 120.6C69.5 107.2 66 90.1 66 81.1C66 72.1 66.5 54 82.8 36.6C94.3 24.4 107.3 20.5 114.2 19C101.4 29.5 94 41.4 90.3 57.4C101.8 49.2 116.5 48.4 125.9 51.4C117.9 55.2 111.8 59.5 105.6 66.2C100.5 71.8 96.1 78 92.5 87.7C100.5 90.4 105.1 95.8 107.3 102.2C109.5 108.5 111.7 117.7 111.7 117.7Z"
            fill="#111113"
          />
          <path
            d="M66.1 200C66.7 184.2 73.4 170.9 82.9 161.3C91.3 152.8 103.1 146.9 115.7 145.3C116.2 153.8 116 160.4 115.4 168.6C114.9 176.9 112.6 182.7 107.4 188.5C102.1 194.4 96.4 196.2 92.6 197.3C88.7 198.3 72.5 200.3 66.1 200Z"
            fill="#111113"
          />
        </svg>
      </div>
    );

    const renderThumbnail = useMemo(() => {
      if (quest.type === 'video') {
        return <img className="questThumbnail" src={quest.thumbnailUrl} alt="" />;
      }
      if (quest.type === 'social') {
        const questImage = quest?.questImage;
        return questImage ? <img className="questThumbnail" src={questImage} alt={quest.title} /> : <TwitterIcon />;
      }
      if (quest.type === 'dex') {
        return <DexIcon />;
      }
      if (quest.type === 'quiz') return;
      if (quest.type === 'custom') {
        if (isXConnectCustomTask(quest)) {
          return quest?.questImage ? (
            <img className="questThumbnail" src={quest.questImage} alt={quest.title} />
          ) : (
            <TwitterIcon />
          );
        }
        if (isDefaultCustomTask(quest)) {
          if (quest.questImage) {
            return <img className="questThumbnail" src={quest.questImage} alt={quest.title} />;
          }
        }
      }
      if (quest.type === 'referral') {
        return (
          <img
            src={quest?.questImage || Picture}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        );
      }
    }, [quest]);

    const isDisabled = useMemo(() => !accountId || accountId === '0x', [accountId]);

    if (quest.type === 'quiz') {
      return (
        <div style={lockedStyle}>
          {quest?.completed && <div className="overlay" />}
          <QuizQuest quizTask={quest} isDisabled={isDisabled} />
        </div>
      );
    }

    if (quest.type === 'custom' && quest.subtype === 'wallet') {
      return <CustomWalletQuest quest={quest} organizationId={organizationId} />;
    }

    if (quest.type === 'custom' && isXConnectCustomTask(quest)) {
      return (
        <XConnectQuest
          quest={quest}
          remainingDays={remainingDays}
          accountId={accountId}
          campaignId={campaignId}
          organizationId={organizationId}
          isDisabled={isDisabled}
        />
      );
    }

    return (
      <div
        ref={ref}
        className="questCard"
        style={lockedStyle}
        onClick={() => {
          if (quest.type !== 'video' && quest.type !== 'referral') {
            handleClick();
          }
        }}
      >
        <>
          {quest?.completed && <div className="overlay" />}

          <div
            className="questThumbnailBlock"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (quest.type === 'video') {
                handleOnQuestClick((quest as unknown as VideoTask).videoUrl);
              }
            }}
          >
            {renderThumbnail}
            <div className="pointsBlock">
              {quest?.points && quest.points > 0 && (
                <div className="points">
                  <Text as="span" style={{ whiteSpace: 'nowrap' }}>
                    {quest.points} Pts
                  </Text>
                </div>
              )}
              {quest.type === 'referral' && quest?.percents > 0 && (
                <div className="points">
                  <Text as="span" style={{ whiteSpace: 'nowrap' }}>
                    {quest.percents} %
                  </Text>
                </div>
              )}
            </div>
          </div>
          <div className="questContent">
            <div className="questInfo">
              <div className="textContent">
                <Text weight="1" className="questTitle">
                  {formatText(quest.title as string)}
                </Text>
                <Text className="questDescription">{formatText(quest.description ?? '')}</Text>
                {quest.type === 'referral' && (
                  <Text className="questDescription">
                    Your referrals:{' '}
                    {isArrayOfInvitees(quest.invitees || [])
                      ? (quest.invitees as string[])?.length || 0
                      : quest.invitees || 0}
                  </Text>
                )}
                <div className="questFooter">
                  <Text className="timeRemaining">{remainingDays}d remaining</Text>
                  <div className="questActions">
                    {quest.completed && <Text style={{ color: '#0ee640' }}>Completed</Text>}

                    {!quest.completed &&
                      (quest.type !== 'social' ? (
                        <button
                          className="startButton"
                          disabled={isDisabled}
                          onClick={() => {
                            if (quest.type === 'video' || quest.type === 'referral') {
                              handleClick();
                            }
                          }}
                        >
                          {quest.type === 'video' && 'Watch & Earn →'}
                          {quest.type === 'dex' && 'Buy tokens →'}
                          {quest.type === 'referral' && 'Copy the invite'}
                          {quest.type === 'custom' && isXConnectCustomTask(quest) && 'Connect X Account →'}
                          {quest.type === 'custom' && isDefaultCustomTask(quest) && 'Start Quest →'}
                        </button>
                      ) : (
                        <RepostButton
                          card
                          quest={quest}
                          disabled={isDisabled}
                          accountId={accountId}
                          campaignId={campaignId}
                        >
                          <button className="startButton">Share now!</button>
                        </RepostButton>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {quest.type === 'social' && (
            <div className="instructions">
              <Text className="instructionsTitle">Instructions: </Text>
              <Text className="instructionsText">
                {quest.instructions
                  ? formatText(quest.instructions)
                  : "Click the 'Repost' button to share this tweet on your Twitter account. Make sure to keep the @cereofficial mention and hashtags for your entry to be valid."}
              </Text>
              <RepostButton quest={quest} accountId={accountId} disabled={isDisabled} campaignId={campaignId}>
                Repost
              </RepostButton>
            </div>
          )}
          {quest.type === 'dex' && (
            <div className="instructions">
              <button className="button" disabled={isDisabled}>
                Buy tokens
              </button>
            </div>
          )}
          {quest.type === 'referral' && (
            <div className="instructions">
              <Text className="instructionsTitle">Instructions: </Text>
              <Text className="instructionsText">{formatText(quest.instructions)}</Text>
              <button
                className="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOnReferralButtonClick();
                }}
                disabled={isDisabled}
              >
                Refer-a-friend
              </button>
            </div>
          )}
          {quest.type === 'custom' && isXConnectCustomTask(quest) && (
            <div className="instructions">
              <Text className="instructionsTitle">Instructions: </Text>
              {(quest as CustomTask).instructions && (
                <Text className="instructionsText">{formatText((quest as CustomTask)?.instructions || '')}</Text>
              )}
              <button
                className="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                disabled={isDisabled}
              >
                Connect X Account
              </button>
            </div>
          )}
          {quest.type === 'custom' && isDefaultCustomTask(quest) && (
            <div className="instructions">
              <Text className="instructionsTitle">Instructions: </Text>
              {(quest as CustomTask)?.instructions && (
                <Text className="instructionsText">{formatText((quest as any).instructions)}</Text>
              )}
              {(quest as CustomTask)?.link && (
                <button
                  className="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                  disabled={isDisabled}
                >
                  Open Link
                </button>
              )}
            </div>
          )}
        </>
        {snackbarMessage && (
          <Snackbar style={{ zIndex: 99999 }} onClose={() => setSnackbarMessage(null)} duration={5000}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardCheck />
                {snackbarMessage}
              </Text>
            </div>
          </Snackbar>
        )}
      </div>
    );
  },
);
