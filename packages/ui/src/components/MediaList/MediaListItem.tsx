import { Card } from '@telegram-apps/telegram-ui';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import defaultThumbnail from './defaultThumbnail.png';

export type MediaListItemProps = {
  name: string;
  description: string;
  thumbnailUrl?: string | null;
  locked?: boolean;
};

export const MediaListItem = ({ name, description }: MediaListItemProps) => {
  return (
    <Card style={{ margin: 8 }} type="ambient">
      <img
        src={defaultThumbnail}
        style={{
          display: 'block',
          objectFit: 'cover',
          width: '100%',
        }}
      />
      <Card.Cell readOnly subtitle={description}>
        {name}
      </Card.Cell>
    </Card>
  );
};
