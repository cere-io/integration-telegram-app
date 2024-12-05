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

  const [title, setTitle] = useState<string>(campaign?.title || '');
  const [description, setDescription] = useState<string>(campaign?.description || '');

  const [startDate, setStartDate] = useState<string>(
    campaign?.startDate ? new Date(campaign.startDate).toISOString().slice(0, 16) : '',
  );
  const [endDate, setEndDate] = useState<string>(
    campaign?.endDate ? new Date(campaign.endDate).toISOString().slice(0, 16) : '',
  );

  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuests, setSelectedQuests] = useState<MultiselectOption[]>(
    campaign?.quests?.map((q) => ({ value: q.id!.toString(), label: q.title! })) || [],
  );

  useEffect(() => {
    let isMounted = true;
    bot.getQuests().then((quests) => {
      if (isMounted) setQuests(quests);
    });
    return () => {
      isMounted = false;
    };
  }, [bot]);

  const formatDateForBackend = (date: string) => new Date(date).toISOString().slice(0, 19);

  const handleSave = () => {
    if (!title || !description || !startDate || !endDate) {
      alert('Please fill in all fields.');
      return;
    }

    onSave?.({
      id: campaign?.id,
      title,
      description,
      startDate: formatDateForBackend(startDate) as unknown as Date,
      endDate: formatDateForBackend(endDate) as unknown as Date,
      quests: selectedQuests.map(
        (quest) => quests.find((q) => q.id === Number(quest.value)) || { id: Number(quest.value) },
      ),
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
        placeholder="Enter campaign title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        header="Description"
        placeholder="Enter campaign description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Input
        type="datetime-local"
        header="Start Date"
        placeholder="Enter start date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
      <Input
        type="datetime-local"
        header="End Date"
        placeholder="Enter end date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
      <Multiselect
        header="Quests"
        placeholder="Select quests"
        onChange={setSelectedQuests as any}
        options={quests.map((quest) => ({ value: (quest.id as number).toString(), label: quest.title })) as any}
        value={selectedQuests}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <Button mode="gray" size="s" onClick={handleDelete} disabled={!campaign?.id} loading={isLoading}>
          Delete
        </Button>
        <Button mode="filled" size="s" onClick={handleSave} loading={isLoading}>
          Save
        </Button>
      </div>
    </>
  );
};
