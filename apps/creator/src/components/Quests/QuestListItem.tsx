import { CardProps, Cell, Badge } from '@telegram-apps/telegram-ui';
import { PlayIcon, XIcon } from '@tg-app/ui';
import { ReactNode } from 'react';

export type QuestListItemProps = Pick<CardProps, 'onClick'> & {
  title: string;
  description: string;
  type: string;
  loading?: boolean;
  locked?: boolean;
};

const iconByType = new Map<string, ReactNode>([
  ['video', <PlayIcon />],
  ['post_x', <XIcon />],
]);

export const QuestListItem = ({ title, description, type, rewardPoints, onClick }: QuestListItemProps) => {
  return (
    <Cell
      after={<Badge type="number">{rewardPoints} Points</Badge>}
      description={description}
      titleBadge={iconByType.get(type)}
      onClick={onClick}
    >
      {title}
    </Cell>
  );
};
