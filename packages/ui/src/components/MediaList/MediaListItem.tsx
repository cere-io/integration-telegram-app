import { Card, CardProps, Image, Text } from '@telegram-apps/telegram-ui';

import defaultThumbnail from './defaultThumbnail.png';
import { LockIcon } from '../../icons';

export type MediaListItemProps = Pick<CardProps, 'onClick'> & {
  name: string;
  description: string;
  completed?: boolean;
  thumbnailUrl?: string | null;
  loading?: boolean;
  locked?: boolean;
  rewardPoints?: number;
};

export const MediaListItem = ({
  name,
  description,
  thumbnailUrl,
  rewardPoints,
  locked,
  loading,
  onClick,
  completed = false,
}: MediaListItemProps) => {
  return (
    <Card style={{ margin: 16, display: 'block' }} onClick={onClick}>
      <Image
        src={thumbnailUrl || defaultThumbnail}
        style={{
          display: 'block',
          objectFit: 'cover',
          width: '100%',
          height: '250px',
          borderRadius: 0,
        }}
      >
        {(locked || loading) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              width: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              position: 'relative',
              fontSize: 32,
              color: 'white',
            }}
          >
            {!loading && <LockIcon />}
          </div>
        )}
        {rewardPoints && (
          <div
            style={{
              position: 'absolute',
              top: '14.5px',
              right: '16px',
              backgroundColor: completed ? '#A2ACB066' : '#9244E0',
              padding: '4px 12px',
              borderRadius: '200px',
              color: completed ? '#161D30' : '#fff',
            }}
          >
            <Text color="white">+{rewardPoints} points</Text>
          </div>
        )}
      </Image>
      <Card.Cell readOnly subtitle={description}>
        {name}
      </Card.Cell>
    </Card>
  );
};
