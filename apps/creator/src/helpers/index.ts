import { Campaign } from '@tg-app/api';

/**
 * Finds the active campaign and retrieves its quests.
 * @param campaigns Array of campaigns.
 * @returns Array of quests from the active campaign, or null if no active campaign is found.
 */
export const getActiveCampaign = (campaigns: Campaign[]): Campaign[] => {
  const now = new Date();

  const activeCampaign = campaigns.find(
    (campaign) => new Date(campaign.startDate) <= now && new Date(campaign.endDate) >= now,
  );

  return activeCampaign || null;
};
