import { Badge, Card, CardProps, Text } from '@telegram-apps/telegram-ui';
import './QuestsListItem.css';
import { useState } from 'react';
import { ArrowIcon, Button } from '@tg-app/ui';
import { useMiniApp } from '@telegram-apps/sdk-react';

export type QuestsListItemProps = Pick<CardProps, 'onClick'> & {
  name: string;
  description: string;
  rewardPoints: number;
  questType: 'video' | 'post_url';
  postUrl?: string;
  loading?: boolean;
  completed?: boolean;
};

export const QuestsListItem = ({
  name,
  description,
  rewardPoints,
  questType,
  completed,
  postUrl,
}: QuestsListItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const miniApp = useMiniApp();

  const handleClick = () => {
    if (questType === 'post_url') {
      setIsOpen((prev) => !prev);
    }
  };

  const handleRetweet = () => {
    if (questType === 'post_url' && postUrl) {
      const text = encodeURIComponent('#CereMedia');
      // @TODO think about how to do it generic
      const quoteTweetUrl = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(postUrl)}`;

      if (miniApp && typeof (miniApp as any).postEvent === 'function') {
        (miniApp as any).postEvent('web_app_open_link', {
          url: quoteTweetUrl,
        });
      } else {
        window.open(quoteTweetUrl, '_blank');
      }
    }
  };

  return (
    <Card style={{ margin: 16, display: 'block' }}>
      <Card.Cell
        onClick={handleClick}
        readOnly
        subtitle={description}
        after={
          <Badge className={`custom-badge ${completed ? 'unlocked' : ''}`} type="number">
            + {rewardPoints} Pts
          </Badge>
        }
      >
        {questType === 'post_url' && (
          <ArrowIcon
            className={`arrow-icon ${isOpen ? 'open' : ''} ${miniApp.isDark ? '' : 'dark-icon'}`}
            style={{ marginRight: '12px' }}
          />
        )}
        {name}
      </Card.Cell>
      {questType === 'post_url' && isOpen && (
        <div style={{ padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#F5FAFC12',
              padding: '12px',
              borderRadius: '12px',
            }}
          >
            <Text color="white">How to participate:</Text>
            <Text color="white">1. Repost our announcement on X (Twitter)</Text>
            <Text color="white">2. Submit your tweet URL to earn points</Text>
          </div>
          <Button
            style={{ width: '100%', marginTop: '12px', marginBottom: '24px', borderRadius: '8px' }}
            mode="cta"
            onClick={handleRetweet}
          >
            Repost on X (Twitter)
          </Button>
        </div>
      )}
    </Card>
  );
};
