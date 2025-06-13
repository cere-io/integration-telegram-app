import clsx from 'clsx';
import { ReactNode } from 'react';
import { tweet } from 'twitter-intent';

import { Text } from '../../index.ts';
import styles from './Button.module.css';

type RepostButtonType = {
  quest: any;
  accountId?: string;
  disabled?: boolean;
  campaignId?: number;
  card?: boolean;
  children: ReactNode;
};

export const RepostButton = ({ quest, accountId, disabled, campaignId, card = false, children }: RepostButtonType) => {
  const hashtags = ['#CereMedia', ...quest.hashtags.filter(Boolean).map((tag: any) => `#${tag}`)];

  const baseText = quest.tweetText?.trim() ? quest.tweetText : 'Check this out!';

  const tweetText = [baseText, '', 'Ref:', `${accountId}:${campaignId}`, '', hashtags.join(' ')].join('\n');

  return (
    <a
      className={clsx(styles.button, card ? styles.card : '')}
      href={tweet.url({
        url: quest.tweetLink,
        text: tweetText,
      })}
      data-disabled={disabled}
      target="_blank"
      rel="noreferrer"
    >
      <Text>{children}</Text>
    </a>
  );
};
