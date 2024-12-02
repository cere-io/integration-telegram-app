import {ButtonCell, Card, CardProps, IconButton, Image, InlineButtons} from '@telegram-apps/telegram-ui';

import defaultThumbnail from './defaultThumbnail.png';
import { LockIcon } from '../../icons';
import {Icon20QuestionMark} from "@telegram-apps/telegram-ui/dist/icons/20/question_mark";
import {
    InlineButtonsItem
} from "@telegram-apps/telegram-ui/dist/components/Blocks/InlineButtons/components/InlineButtonsItem/InlineButtonsItem";
import {Icon24Chat} from "@telegram-apps/telegram-ui/dist/icons/24/chat";
import {Icon24Notifications} from "@telegram-apps/telegram-ui/dist/icons/24/notifications";

export type MediaListItemProps = Pick<CardProps, 'onClick'> & {
  name: string;
  description: string;
  thumbnailUrl?: string | null;
  loading?: boolean;
  locked?: boolean;
};

export const MediaListItem = ({ name, description, thumbnailUrl, locked, loading, onClick }: MediaListItemProps) => {
  return (
    <Card style={{ margin: 16, display: 'block'}} onClick={onClick}>
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
      </Image>
      <Card.Cell readOnly subtitle={description}>
        {name}
      </Card.Cell>
    </Card>
  );
};
