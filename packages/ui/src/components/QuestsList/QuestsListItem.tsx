import { Badge, Card, CardProps, Input, Text } from '@telegram-apps/telegram-ui';
import './QuestsListItem.css';
import { useState } from 'react';
import { ArrowIcon, Button } from '@tg-app/ui';

export type QuestsListItemProps = Pick<CardProps, 'onClick'> & {
  name: string;
  description: string;
  rewardPoints: number;
  questType: 'video' | 'post_x';
  loading?: boolean;
  completed?: boolean;
};

export const QuestsListItem = ({ name, description, rewardPoints, questType, completed }: QuestsListItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (questType === 'post_x') {
      setIsOpen((prev) => !prev);
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
        {questType === 'post_x' && (
          <ArrowIcon className={`arrow-icon ${isOpen ? 'open' : ''}`} style={{ marginRight: '12px' }} />
        )}
        {name}
      </Card.Cell>
      {questType === 'post_x' && isOpen && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#F5FAFC12' }}>
            <Text color="white">How to participate:</Text>
            <Text color="white">1. Repost our announcement on X (Twitter)</Text>
            <Text color="white">2. Submit your tweet URL to earn points</Text>
          </div>
          <Button style={{ width: '100%', marginTop: '12px', marginBottom: '24px', borderRadius: '8px' }} mode="cta">
            Repost on X (Twitter)
          </Button>
          <Input header="Url" placeholder="Enter your tweet URL" />
          <Button style={{ marginTop: '12px', width: '100%', borderRadius: '8px' }}>Submit Tweet URL</Button>
        </div>
      )}
    </Card>
  );
};
