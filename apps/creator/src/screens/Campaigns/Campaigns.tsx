import { useBot } from '../../hooks';
import { useCallback, useEffect, useState } from 'react';
import { Campaign } from '@tg-app/api';
import { Button } from '@tg-app/ui';
import { Modal } from '../../components/Modal';
import { CampaignListItem } from '../../components/Campaign/CampaigntListItem.tsx';
import { EditCampaignModalContent } from '../../components/Campaign/EditCampaignModalContent.tsx';

export const Campaigns = () => {
  const bot = useBot();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    bot.getCampaigns().then((campaigns) => {
      setCampaigns(campaigns);
    });
  }, [bot]);

  const handleOnCampaignSave = useCallback(
    async (campaign: Campaign) => {
      setIsLoading(true);
      try {
        if (campaign.id) {
          await bot.saveCampaign(campaign);
          setCampaigns((prevCampaigns) => prevCampaigns.map((v) => (v.id === campaign.id ? campaign : v)));
        } else {
          const newCampaign = await bot.saveCampaign(campaign);
          setCampaigns((prevCampaigns) => [...prevCampaigns, newCampaign]);
        }
      } catch (error) {
        console.error('Error saving campaign:', error);
      } finally {
        setIsLoading(false);
        setSelectedCampaign(undefined);
      }
    },
    [bot],
  );

  const handleOnDelete = useCallback(
    async (campaignId: number) => {
      setIsLoading(true);
      try {
        await bot.deleteCampaign(campaignId);
        setCampaigns((prevCampaigns) => prevCampaigns.filter((campaign) => campaign.id !== campaignId));
      } catch (error) {
        console.error('Error deleting campaign:', error);
      } finally {
        setIsLoading(false);
        setSelectedCampaign(undefined);
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
            setSelectedCampaign({ title: '', description: '', quests: [], startDate: new Date(), endDate: new Date() })
          }
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
      {selectedCampaign && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCampaign(undefined)}
          content={
            <EditCampaignModalContent
              isLoading={isLoading}
              campaign={selectedCampaign}
              onSave={handleOnCampaignSave}
              onDelete={handleOnDelete}
            />
          }
        />
      )}
    </div>
  );
};
