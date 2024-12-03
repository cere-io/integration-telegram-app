import { useBot } from '../../hooks';
import { useEffect, useState } from 'react';
import { Quest } from '@tg-app/api';
import { Button, List } from '@tg-app/ui';
import { Modal } from '../../components/Modal';
import { QuestListItem } from '../../components/Quests/QuestListItem.tsx';
import { EditQuestModalContent } from '../../components/Quests/EditQuestModalContent.tsx';

export const Quests = () => {
  const bot = useBot();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest>();

  useEffect(() => {
    bot.getQuests().then((quests) => {
      setQuests(quests);
    });
  }, [bot]);

  return (
    <div>
      <div className="HIJtihMA8FHczS02iWF5">
        <Button
          mode="filled"
          size="s"
          style={{ alignItems: 'center' }}
          onClick={() => setSelectedQuest({ title: '', description: '', type: '', videoId: '', rewardPoints: 0 })}
        >
          Add quest
        </Button>
      </div>
      {quests.map((quest, index) => (
        <QuestListItem
          key={index}
          title={quest.title}
          description={quest.description}
          type={quest.type}
          videoId={quest.videoId}
          rewardPoints={quest.rewardPoints}
          onClick={() => setSelectedQuest(quest)}
        />
      ))}
      {selectedQuest ? (
        <Modal
          isOpen={true}
          onClose={() => setSelectedQuest(null)}
          content={<EditQuestModalContent quest={selectedQuest} />}
        />
      ) : (
        <div></div>
      )}
    </div>
  );
};
