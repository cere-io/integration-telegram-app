import { ActivityEvent } from '@cere-activity-sdk/events';
import clsx from 'clsx';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { tweet } from 'twitter-intent';

import { useCereWallet } from '../../../../../apps/viewer/src/cere-wallet';
import { useEvents } from '../../../../../apps/viewer/src/hooks';
import { useData } from '../../../../../apps/viewer/src/providers';
import {
  createXVerificationService,
  XVerificationService,
} from '../../../../../apps/viewer/src/services/xVerificationService';
import { Text } from '../../index.ts';
import styles from './Button.module.css';

type SocialQuestButtonProps = {
  quest: any;
  accountId?: string;
  disabled?: boolean;
  campaignId?: number;
  organizationId?: string | number;
  card?: boolean;
  children: ReactNode;
};

export const SocialQuestButton = ({
  quest,
  accountId,
  disabled,
  campaignId,
  organizationId,
  card = false,
  children,
}: SocialQuestButtonProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const cereWallet = useCereWallet();
  const eventSource = useEvents();
  const { activeCampaignId, activeOrganizationId, refetchQuestsForTab } = useData();

  const xVerificationService: XVerificationService = createXVerificationService(cereWallet);

  // Reset verification status when quest completion changes
  useEffect(() => {
    if (quest.completed) {
      setVerificationStatus('success');
    } else {
      setVerificationStatus('idle');
    }
  }, [quest.completed]);

  const handleRetweet = useCallback(() => {
    const hashtags = ['#CereMedia', ...quest.hashtags.filter(Boolean).map((tag: any) => `#${tag}`)];
    const baseText = quest.tweetText?.trim() ? quest.tweetText : 'Check this out!';
    const tweetText = [baseText, '', 'Ref:', `${accountId}:${campaignId}`, '', hashtags.join(' ')].join('\n');

    window.open(
      tweet.url({
        url: quest.tweetLink,
        text: tweetText,
      }),
      '_blank',
    );
  }, [quest, accountId, campaignId]);

  const handleFollow = useCallback(() => {
    if (!quest.followAccount) return;

    // Open Twitter follow intent
    window.open(`https://twitter.com/intent/follow?screen_name=${quest.followAccount}`, '_blank');
  }, [quest.followAccount]);

  const handleLike = useCallback(() => {
    if (!quest.targetTweetId) return;

    // Extract tweet ID and open like intent
    const tweetId = quest.targetTweetId.match(/\/status\/(\d+)/)
      ? quest.targetTweetId.match(/\/status\/(\d+)/)[1]
      : quest.targetTweetId;

    window.open(`https://twitter.com/intent/like?tweet_id=${tweetId}`, '_blank');
  }, [quest.targetTweetId]);

  const handleTweetAndShare = useCallback(() => {
    const hashtags = quest.hashtags || [];
    const keywords = quest.keywords || [];
    const urls = quest.requiredUrls || [];

    // Create suggested tweet text
    let tweetText = 'Check this out! ';

    if (keywords.length > 0) {
      tweetText += keywords[0] + ' ';
    }

    if (urls.length > 0) {
      tweetText += urls[0] + ' ';
    }

    if (hashtags.length > 0) {
      tweetText += hashtags.map((tag: string) => `#${tag}`).join(' ') + ' ';
    }

    tweetText += `\n\nRef: ${accountId}:${campaignId}`;

    window.open(
      tweet.url({
        text: tweetText.trim(),
      }),
      '_blank',
    );
  }, [quest, accountId, campaignId]);

  const verifyQuestCompletion = useCallback(async () => {
    if (!cereWallet || isVerifying || disabled) return;

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const token = await xVerificationService.generateWalletToken();
      if (!token) {
        throw new Error('Failed to generate authentication token');
      }

      let isCompleted = false;

      switch (quest.requirements.action) {
        case 'follow':
          if (quest.followAccount) {
            isCompleted = await xVerificationService.verifyFollow(quest.followAccount, token);
          }
          break;

        case 'like':
          if (quest.targetTweetId) {
            isCompleted = await xVerificationService.verifyLike(quest.targetTweetId, token);
          }
          break;

        case 'tweet_and_share':
          isCompleted = await xVerificationService.verifyTweetAndShare(
            quest.keywords || [],
            quest.requiredUrls || [],
            token,
          );
          break;

        default:
          // For retweet and unknown actions, we don't auto-verify
          setErrorMessage('This quest type requires manual verification');
          return;
      }

      if (isCompleted) {
        setVerificationStatus('success');

        // Send completion event
        if (eventSource && !quest.completed) {
          const activityEventPayload = {
            quest_id: quest.id,
            social_quest: true,
            timestamp: new Date().toISOString(),
            organization_id: organizationId || activeOrganizationId,
            campaign_id: campaignId || activeCampaignId,
            campaignId: campaignId || activeCampaignId,
            action: quest.requirements.action,
            platform: quest.platform,
          };

          const activityEvent = new ActivityEvent('SOCIAL_QUEST_COMPLETED', activityEventPayload);
          await eventSource.dispatchEvent(activityEvent);

          // Refresh quest data after a delay
          setTimeout(() => refetchQuestsForTab(), 3000);
        }
      } else {
        setVerificationStatus('error');
        setErrorMessage(
          `${quest.requirements.action} verification failed. Please ensure you have completed the required action.`,
        );
      }
    } catch (error) {
      console.error('Error verifying quest:', error);
      setVerificationStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, [
    cereWallet,
    isVerifying,
    disabled,
    xVerificationService,
    quest,
    eventSource,
    organizationId,
    activeOrganizationId,
    campaignId,
    activeCampaignId,
    refetchQuestsForTab,
  ]);

  const handleClick = useCallback(async () => {
    if (disabled) return;

    // For completed quests, don't do anything
    if (quest.completed) return;

    switch (quest.requirements.action) {
      case 'retweet':
        handleRetweet();
        break;
      case 'follow':
        handleFollow();
        // Auto-verify follow after a delay to allow time for the action
        setTimeout(() => verifyQuestCompletion(), 3000);
        break;
      case 'like':
        handleLike();
        // Auto-verify like after a delay
        setTimeout(() => verifyQuestCompletion(), 3000);
        break;
      case 'tweet_and_share':
        handleTweetAndShare();
        // Auto-verify tweet after a delay
        setTimeout(() => verifyQuestCompletion(), 5000);
        break;
      default:
        console.warn('Unknown social quest action:', quest.requirements.action);
    }
  }, [
    disabled,
    quest.completed,
    quest.requirements.action,
    handleRetweet,
    handleFollow,
    handleLike,
    handleTweetAndShare,
    verifyQuestCompletion,
  ]);

  const getButtonText = () => {
    if (quest.completed) {
      return 'Completed ✓';
    }

    if (isVerifying) {
      return 'Verifying...';
    }

    if (verificationStatus === 'success') {
      return 'Completed ✓';
    }

    switch (quest.requirements.action) {
      case 'retweet':
        return 'Repost';
      case 'follow':
        return 'Follow';
      case 'like':
        return 'Like';
      case 'tweet_and_share':
        return 'Tweet';
      default:
        return children;
    }
  };

  return (
    <div>
      <button
        className={clsx(styles.button, card ? styles.card : '')}
        onClick={handleClick}
        disabled={disabled || isVerifying || quest.completed}
        data-disabled={disabled || quest.completed}
      >
        <Text>{getButtonText()}</Text>
      </button>

      {verificationStatus === 'error' && errorMessage && (
        <div className="error-message" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
          {errorMessage}
        </div>
      )}

      {/* Manual verification button for actions that can be re-checked */}
      {!quest.completed &&
        !isVerifying &&
        (quest.requirements.action === 'follow' ||
          quest.requirements.action === 'like' ||
          quest.requirements.action === 'tweet_and_share') && (
          <button
            className={clsx(styles.button, 'verify-button')}
            onClick={verifyQuestCompletion}
            disabled={disabled || isVerifying}
            style={{ marginTop: '8px', fontSize: '12px', padding: '4px 8px' }}
          >
            <Text>Check Progress</Text>
          </button>
        )}
    </div>
  );
};
