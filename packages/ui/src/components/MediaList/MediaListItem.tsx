import { Card, CardProps, Image } from '@telegram-apps/telegram-ui';

import defaultThumbnail from './defaultThumbnail.png';

export type MediaListItemProps = Pick<CardProps, 'onClick'> & {
  name: string;
  description: string;
  thumbnailUrl?: string | null;
  locked?: boolean;
};

export const MediaListItem = ({ name, description, onClick }: MediaListItemProps) => {
  return (
    <Card style={{ margin: 16, display: 'block' }} onClick={onClick}>
      <Image
        src={defaultThumbnail}
        style={{
          display: 'block',
          objectFit: 'cover',
          width: '100%',
          height: '150px',
          borderRadius: 0,
        }}
      ></Image>
      <Card.Cell readOnly subtitle={description}>
        {name}
      </Card.Cell>
    </Card>
  );
};
