import { QuestsList, QuestsListItem, Title } from '@tg-app/ui';
import { useBot } from '../../hooks';
import { useEffect, useState } from 'react';
import { Quest } from '@tg-app/api';

export const ActiveQuests = () => {
  const bot = useBot();
  const [quests, setQuests] = useState<Quest[]>([]);

  useEffect(() => {
    bot.getQuests().then(setQuests);
  }, [bot]);

  return (
    <div>
      <Title weight="2" style={{ marginLeft: 16, marginTop: 16 }}>
        Yours weekly tasks
      </Title>
      <QuestsList>
        {quests.map((quest) => (
          <QuestsListItem
            key={quest.id}
            locked={true}
            name={quest?.title || ''}
            description={quest?.description || ''}
            rewardPoints={quest?.rewardPoints || 0}
            questType={quest.type as 'video' | 'post_x'}
          />
        ))}
      </QuestsList>
    </div>
  );
};
