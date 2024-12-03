import { useBot } from '../../hooks';
import { useEffect, useState } from 'react';
import { Campaign } from '@tg-app/api';
import { Button } from '@tg-app/ui';
import { QuestListItem } from '../../components/Quests/QuestListItem.tsx';
import { Modal } from '../../components/Modal';
import { EditQuestModalContent } from '../../components/Quests/EditQuestModalContent.tsx';
import { CampaignListItem } from '../../components/Campaign/CampaigntListItem.tsx';
import { EditCampaignModalContent } from '../../components/Campaign/EditCampaignModalContent.tsx';

export const Campaigns = () => {
  const bot = useBot();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign>();

  useEffect(() => {
    bot.getCampaigns().then((campaigns) => {
      setCampaigns(campaigns);
    });
  }, [bot]);

  return (
    <div>
      <div className="HIJtihMA8FHczS02iWF5">
        <Button
          mode="filled"
          size="s"
          style={{ alignItems: 'center' }}
          onClick={() => setSelectedCampaign({ title: '', description: '', quests: [] })}
        >
          Add campaign
        </Button>
      </div>
      {campaigns.map((campaign, index) => (
        <CampaignListItem
          key={index}
          title={campaign.title}
          description={campaign.description}
          quests={campaign.quests}
          onClick={() => setSelectedCampaign(campaign)}
        />
      ))}
      {selectedCampaign ? (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCampaign(null)}
          content={<EditCampaignModalContent campaign={selectedCampaign} />}
        />
      ) : (
        <div></div>
      )}
    </div>
  );
};
