import { ActivityEvent } from '@cere-activity-sdk/events';
import clsx from 'clsx';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
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

type SocialActionButtonProps = {
  quest: any;
  accountId?: string;
  disabled?: boolean;
  campaignId?: number;
  organizationId?: string | number;
  card?: boolean;
  children: ReactNode;
};

// Global verification state to avoid duplicate requests
const verificationState = new Map<
  string,
  {
    isVerifying: boolean;
    lastVerified: number;
    verificationCount: number;
  }
>();

const VERIFICATION_COOLDOWN = 30000; // 30 seconds
const MAX_VERIFICATIONS_PER_HOUR = 10; // Limit API calls

export const SocialActionButton = ({
  quest,
  accountId,
  disabled,
  campaignId,
  organizationId,
  card = false,
  children,
}: SocialActionButtonProps) => {
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

  // Initial verification on mount (only for non-completed quests)
  useEffect(() => {
    if (!quest.completed && !disabled && cereWallet) {
      const questKey = `${quest.id}-${accountId}`;
      const state = verificationState.get(questKey);

      // Only verify if we haven't verified recently and haven't hit rate limits
      if (
        !state ||
        (Date.now() - state.lastVerified > VERIFICATION_COOLDOWN &&
          state.verificationCount < MAX_VERIFICATIONS_PER_HOUR)
      ) {
        verifyQuestCompletion();
      }
    }
  }, [quest.completed, disabled, cereWallet]);

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

  const verifyQuestCompletion = useCallback(async () => {
    if (!cereWallet || isVerifying || disabled) return;

    const questKey = `${quest.id}-${accountId}`;
    const state = verificationState.get(questKey) || {
      isVerifying: false,
      lastVerified: 0,
      verificationCount: 0,
    };

    // Check rate limits
    if (state.isVerifying) return;
    if (Date.now() - state.lastVerified < VERIFICATION_COOLDOWN) return;
    if (state.verificationCount >= MAX_VERIFICATIONS_PER_HOUR) {
      setErrorMessage('Rate limit reached. Please try again later.');
      return;
    }

    // Update state
    state.isVerifying = true;
    verificationState.set(questKey, state);
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

        case 'retweet':
          // For retweet, we don't auto-verify as it requires manual verification
          setErrorMessage('This quest type requires manual verification');
          return;

        default:
          setErrorMessage('Unknown quest action type');
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

      // Update verification state
      state.lastVerified = Date.now();
      state.verificationCount++;
      verificationState.set(questKey, state);
    } catch (error) {
      console.error('Error verifying quest:', error);
      setVerificationStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      state.isVerifying = false;
      verificationState.set(questKey, state);
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
    accountId,
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

  const handleClick = useCallback(() => {
    if (disabled || quest.completed) return;

    // For retweet, just open the retweet URL
    if (quest.requirements.action === 'retweet') {
      return; // Let the link handle it
    }

    // For other actions, open the appropriate intent and verify after delay
    switch (quest.requirements.action) {
      case 'follow':
        if (quest.followAccount) {
          window.open(`https://twitter.com/intent/follow?screen_name=${quest.followAccount}`, '_blank');
          // Verify after 10 seconds to allow time for the action
          setTimeout(() => verifyQuestCompletion(), 10000);
        }
        break;
      case 'like':
        if (quest.targetTweetId) {
          const tweetId = xVerificationService.extractTweetId(quest.targetTweetId);
          window.open(`https://twitter.com/intent/like?tweet_id=${tweetId}`, '_blank');
          // Verify after 10 seconds
          setTimeout(() => verifyQuestCompletion(), 10000);
        }
        break;
      case 'tweet_and_share':
        const hashtags = quest.hashtags || [];
        const keywords = quest.keywords || [];
        const urls = quest.requiredUrls || [];

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

        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText.trim())}`, '_blank');
        // Verify after 15 seconds for tweets
        setTimeout(() => verifyQuestCompletion(), 15000);
        break;
    }
  }, [
    disabled,
    quest.completed,
    quest.requirements.action,
    quest.followAccount,
    quest.targetTweetId,
    quest.hashtags,
    quest.keywords,
    quest.requiredUrls,
    quest.tweetText,
    quest.tweetLink,
    accountId,
    campaignId,
    xVerificationService,
    verifyQuestCompletion,
  ]);

  // For retweet, use anchor tag like original RepostButton
  if (quest.requirements.action === 'retweet') {
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
  }

  // For other actions, use button
  return (
    <>
      <button
        className={clsx(styles.button, card ? styles.card : '')}
        onClick={handleClick}
        disabled={disabled || isVerifying || quest.completed}
        data-disabled={disabled || quest.completed}
      >
        <Text>{children ? children : getButtonText()}</Text>
      </button>

      {verificationStatus === 'error' && errorMessage && (
        <div className="error-message" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
          <Text>{errorMessage}</Text>
        </div>
      )}
    </>
  );
};
