import { useBot } from '../../hooks';
import { useCallback, useEffect, useState } from 'react';
import { Quest } from '@tg-app/api';
import { Button, Text } from '@tg-app/ui';
import { Modal } from '../../components/Modal';
import { QuestListItem } from '../../components/Quests/QuestListItem.tsx';
import { EditQuestModalContent } from '../../components/Quests/EditQuestModalContent.tsx';
import './Quests.css';

export const Quests = () => {
  const bot = useBot();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    bot.getQuests().then((quests) => {
      setQuests(quests);
    });
  }, [bot]);

  const handleOnQuestSave = useCallback(
    async (quest: Quest) => {
      setIsLoading(true);
      try {
        if (quest.id) {
          await bot.saveQuest(quest);
          setQuests((prevQuests) => prevQuests.map((v) => (v.id === quest.id ? quest : v)));
        } else {
          const newQuest = await bot.saveQuest(quest);
          setQuests((prevQuests) => [...prevQuests, newQuest]);
        }
      } catch (error) {
        console.error('Error saving quest:', error);
      } finally {
        setIsLoading(false);
        setSelectedQuest(undefined);
      }
    },
    [bot],
  );

  const handleOnDelete = useCallback(
    async (questId: number) => {
      setIsLoading(true);
      try {
        await bot.deleteQuest(questId);
        setQuests((prevQuests) => prevQuests.filter((quest) => quest.id !== questId));
      } catch (error) {
        console.error('Error deleting quest:', error);
      } finally {
        setIsLoading(false);
        setSelectedQuest(undefined);
      }
    },
    [bot],
  );

  return (
    <div>
      <div className="container">
        <Button
          mode="filled"
          size="s"
          style={{ alignItems: 'center' }}
          onClick={() =>
            setSelectedQuest({ title: '', description: '', type: '', videoId: '', url: '', rewardPoints: 0 })
          }
        >
          Add quest
        </Button>
      </div>
      {quests.length === 0 ? (
        <div className="container">
          <Text>No quests available. Click "Add Quest" to get started.</Text>
        </div>
      ) : (
        quests.map((quest, index) => (
          <QuestListItem
            key={index}
            title={quest.title}
            description={quest.description}
            questType={quest.type}
            rewardPoints={quest?.rewardPoints || 0}
            onClick={() => setSelectedQuest(quest)}
          />
        ))
      )}
      {selectedQuest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedQuest(undefined)}
          content={
            <EditQuestModalContent
              quest={selectedQuest}
              onSave={handleOnQuestSave}
              onDelete={handleOnDelete}
              isLoading={isLoading}
            />
          }
        />
      )}
    </div>
  );
};
