import { SocialTask } from '@integration-telegram-app/viewer/src/types';
import { Button } from '@tg-app/ui';
import { ReactNode } from 'react';
import { tweet } from 'twitter-intent';

type RepostButtonType = {
  quest: SocialTask;
  accountId?: string;
  disabled?: boolean;
  campaignId?: number;
  card?: boolean;
  children: ReactNode;
};

export const RepostButton = ({ quest, accountId, disabled, campaignId, card = false, children }: RepostButtonType) => {
  const hashtags = ['#CereMedia', ...quest.hashtags.filter(Boolean).map((tag) => `#${tag}`)];

  const baseText = quest.tweetText?.trim() ? quest.tweetText : 'Check this out!';

  const tweetText = [baseText, '', 'Ref:', `${accountId}:${campaignId}`, '', hashtags.join(' ')].join('\n');

  return (
    <Button
      mode={card ? 'white' : 'cta'}
      className={`button ${card ? 'card' : ''}`}
      href={tweet.url({
        url: quest.tweetLink,
        text: tweetText,
      })}
      data-disabled={disabled}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </Button>
  );
};
