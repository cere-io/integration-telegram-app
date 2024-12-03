import { Input, Textarea, Button, Multiselect } from '@tg-app/ui';
import { useEffect, useState } from 'react';
import { Campaign, Quest } from '@tg-app/api';
import { useBot } from '@integration-telegram-app/viewer/src/hooks';

type ModalProps = {
  isLoading: boolean;

  campaign?: Campaign;
  onSave?: (campaign: Campaign) => void;
  onDelete?: (campaignId: number) => void;
};

export type MultiselectOption = {
  value: string;
  label: string;
};

export const EditCampaignModalContent = ({ campaign, onSave, onDelete, isLoading }: ModalProps) => {
  const bot = useBot();

  const [title, setTitle] = useState(campaign?.title);
  const [description, setDescription] = useState(campaign?.description);

  const [quests, setQuests] = useState<Quest[]>([]);

  const [selectedQuests, setSelectedQuests] = useState<MultiselectOption[]>(
    campaign?.quests?.map((q) => ({ value: q.id! + '', label: q.title! })) || [],
  );

  useEffect(() => {
    bot.getQuests().then((quests) => {
      setQuests(quests);
    });
  }, [bot]);

  const handleSave = () => {
    onSave?.({
      id: campaign?.id,
      title: title!,
      description: description!,
      quests: selectedQuests.map<Quest>((quest) => {
        const foundQuest = quests.filter((q) => q.id === Number(quest.value))[0];
        return foundQuest || {};
      }),
    });
  };

  const handleDelete = () => {
    if (campaign?.id) {
      onDelete?.(campaign.id);
    }
  };

  return (
    <>
      <Input
        header="Title"
        placeholder="I am usual input, just leave me alone"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        header="Description"
        placeholder="I am usual input, just leave me alone"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Multiselect
        header="Quests"
        placeholder="I am usual input, just leave me alone"
        onChange={setSelectedQuests as any}
        options={quests?.map((quest) => ({ value: quest.id, label: quest.title })) as any}
        value={selectedQuests}
      />
      <Button
        mode="gray"
        size="s"
        style={{ float: 'left' }}
        onClick={handleDelete}
        disabled={!campaign?.id}
        loading={isLoading}
      >
        Delete
      </Button>
      <Button mode="filled" size="s" style={{ float: 'right' }} onClick={handleSave} loading={isLoading}>
        Save
      </Button>
    </>
  );
};
