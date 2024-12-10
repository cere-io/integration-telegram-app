import { ReactElement, ReactNode } from 'react';
import { CardProps, Cell, Badge, BadgeProps } from '@telegram-apps/telegram-ui';
import { PlayIcon, XIcon } from '@tg-app/ui';

export type QuestListItemProps = Pick<CardProps, 'onClick'> & {
  type?: string;
  title?: string;
  description?: string;
  rewardPoints?: number;
  questType?: string;
  loading?: boolean;
  locked?: boolean;
};

const iconByType = new Map<string, ReactNode>([
  ['video', <PlayIcon />],
  ['share', <XIcon />],
]);

export const QuestListItem = ({ title, description, questType, rewardPoints, onClick }: QuestListItemProps) => {
  return (
    <Cell
      after={<Badge type="number">{rewardPoints} Points</Badge>}
      description={description}
      titleBadge={iconByType.get(questType as string) as ReactElement<BadgeProps> | undefined}
      onClick={onClick}
    >
      {title}
    </Cell>
  );
};
