import { CardProps, Cell, Badge } from '@telegram-apps/telegram-ui';
import { Quest } from '@tg-app/api';

export type CampaignListItemProps = Pick<CardProps, 'onClick'> & {
  title: string;
  description: string;
  quests: Quest[];
};

export const CampaignListItem = ({ title, description, quests, onClick }: CampaignListItemProps) => {
  return (
    <Cell after={<Badge type="number">{quests.length} Quests</Badge>} description={description} onClick={onClick}>
      {title}
    </Cell>
  );
};
