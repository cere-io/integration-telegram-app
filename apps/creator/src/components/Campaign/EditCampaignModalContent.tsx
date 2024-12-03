import { Input, Textarea, Button, Multiselect } from '@tg-app/ui';
import { useEffect, useState } from 'react';
import { Campaign, Quest } from '@tg-app/api';
import { useBot } from '@integration-telegram-app/viewer/src/hooks';

type ModalProps = {
  campaign?: Campaign;
};

export type MultiselectOption = {
  value: string;
  label: string;
};

export const EditCampaignModalContent = ({ campaign }: ModalProps) => {
  const bot = useBot();

  const [title, setTitle] = useState(campaign?.title);
  const [description, setDescription] = useState(campaign?.description);

  const [quests, setQuests] = useState<Quest[]>([]);

  const [selectedQuests, setSelectedQuests] = useState<MultiselectOption[]>(
    campaign?.quests?.map((q) => ({ value: q.id! + '', label: q.title! })),
  );

  useEffect(() => {
    bot.getQuests().then((quests) => {
      setQuests(quests);
    });
  }, [bot]);

  const handleSave = () => {
    bot.saveCampaign({
      id: campaign?.id,
      title: title!,
      description: description!,
      quests: selectedQuests.map<Quest>((quest) => quests.find((q) => q.id == quest.value)),
    });
  };

  const handleDelete = () => {
    bot.deleteCampaign(campaign?.id);
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
        onChange={setSelectedQuests}
        options={quests.map((quest) => ({ value: quest.id, label: quest.title }))}
        value={selectedQuests}
      />
      <Button mode="gray" size="s" style={{ float: 'left' }} onClick={handleDelete} disabled={!campaign?.id}>
        Delete
      </Button>
      <Button mode="filled" size="s" style={{ float: 'right' }} onClick={handleSave}>
        Save
      </Button>
    </>
  );
};
