import { ActivityEvent } from '@cere-activity-sdk/events';
import { useCereWallet } from '@integration-telegram-app/viewer/src/cere-wallet';
import { useEvents } from '@integration-telegram-app/viewer/src/hooks';
import { useData } from '@integration-telegram-app/viewer/src/providers';
import {
  createXVerificationService,
  XVerificationService,
} from '@integration-telegram-app/viewer/src/services/xVerificationService.ts';
import { SocialTask } from '@integration-telegram-app/viewer/src/types';
import clsx from 'clsx';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { tweet } from 'twitter-intent';

import { Text } from '../../index.ts';
import styles from './Button.module.css';

type RepostButtonType = {
  quest: SocialTask;
  accountId?: string;
  disabled?: boolean;
  campaignId?: number;
  organizationId?: number;
  card?: boolean;
  children?: ReactNode;
};

export const RepostButton = ({
  quest,
  accountId,
  disabled,
  organizationId,
  campaignId,
  card = false,
  children,
}: RepostButtonType) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const cereWallet = useCereWallet();
  const eventSource = useEvents();
  const { activeCampaignId, activeOrganizationId, refetchQuestsForTab } = useData();
  const xVerificationService: XVerificationService = createXVerificationService(cereWallet);

  const getButtonText = () => {
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

  const url = useMemo(() => {
    if (quest.requirements.action === 'retweet') {
      const hashtags = ['#CereMedia', ...quest.hashtags.filter(Boolean).map((tag: any) => `#${tag}`)];

      const baseText = quest.tweetText?.trim() ? quest.tweetText : 'Check this out!';

      const tweetText = [baseText, '', 'Ref:', `${accountId}:${campaignId}`, '', hashtags.join(' ')].join('\n');
      return {
        url: quest.tweetLink,
        text: tweetText,
      };
    }
    return {};
  }, [accountId, campaignId, quest.hashtags, quest.requirements.action, quest.tweetLink, quest.tweetText]);

  const handleLike = useCallback(() => {
    if (!quest.targetTweetId) return;

    const tweetId = xVerificationService.extractTweetId(quest.targetTweetId);

    window.open(`https://twitter.com/intent/like?tweet_id=${tweetId}`, '_blank');
  }, [quest.targetTweetId, xVerificationService]);

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
          setErrorMessage('This quest type requires manual verification');
          return;
      }

      if (isCompleted) {
        setVerificationStatus('success');

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

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (quest.completed) return;
    const action = quest.requirements.action;
    if (action === 'retweet') return;
    if (action === 'like') {
      handleLike();
      // Auto-verify follow after a delay to allow time for the action
      setTimeout(() => verifyQuestCompletion(), 10000);
    }
  }, [disabled, handleLike, quest.completed, quest.requirements.action, verifyQuestCompletion]);

  return (
    <>
      <a
        className={clsx(styles.button, card ? styles.card : '')}
        href={tweet.url(url)}
        onClick={handleClick}
        data-disabled={disabled}
        target="_blank"
        rel="noreferrer"
      >
        <Text>{children ? children : getButtonText()}</Text>
      </a>
      {verificationStatus === 'error' && errorMessage && (
        <div className="error-message" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
          <Text>{errorMessage}</Text>
        </div>
      )}
    </>
  );
};
